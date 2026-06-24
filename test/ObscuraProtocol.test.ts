import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * Confidential Obscura protocol tests (FHEVM mock coprocessor).
 *
 * Run: npm test
 *
 * NOTE: encrypted-input / user-decrypt helpers come from @fhevm/hardhat-plugin (the `fhevm`
 * runtime). If your installed plugin version exposes slightly different helper names, adjust
 * the two helpers below — the contract calls themselves are stable.
 */
describe("Obscura Protocol (confidential)", function () {
  async function deploy() {
    const [deployer, agent] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("ConfidentialMockToken");
    const cUSDT = await Mock.deploy("Confidential USDT", "cUSDT", 6);
    const cWETH = await Mock.deploy("Confidential WETH", "cWETH", 6);
    await cUSDT.waitForDeployment();
    await cWETH.waitForDeployment();

    const Core = await ethers.getContractFactory("ObscuraCore");
    const core = await Core.deploy(deployer.address);

    const Rep = await ethers.getContractFactory("ReputationRegistry");
    const rep = await Rep.deploy();

    const Lending = await ethers.getContractFactory("ObscuraLending");
    const lending = await Lending.deploy(await core.getAddress(), await rep.getAddress());

    const GAD = await ethers.getContractFactory("ObscuraGAD");
    const gad = await GAD.deploy(await core.getAddress(), await rep.getAddress(), await lending.getAddress());

    await (await lending.setGad(await gad.getAddress())).wait();
    await (await rep.setWriter(await lending.getAddress(), true)).wait();
    await (await rep.setWriter(await gad.getAddress(), true)).wait();

    await (await core.registerCollateral(await cWETH.getAddress(), 7500, 8000, 500, 6)).wait();
    await (await core.registerBorrowable(await cUSDT.getAddress(), 900, 6)).wait();
    await (await core.updatePrice(await cWETH.getAddress(), 2600_000000)).wait();
    await (await core.updatePrice(await cUSDT.getAddress(), 1_000000)).wait();

    // seed pool + give the agent collateral
    await (await cUSDT.mint(await lending.getAddress(), 1_000_000_000_000n)).wait();
    await (await cWETH.connect(agent).mint(agent.address, 10_000_000n)).wait(); // 10 cWETH (6d)

    return { deployer, agent, cUSDT, cWETH, core, rep, lending, gad };
  }

  async function enc(contract: string, user: string, amount: bigint) {
    const input = fhevm.createEncryptedInput(contract, user);
    input.add64(amount);
    return input.encrypt(); // { handles, inputProof }
  }

  it("registers markets in cleartext", async () => {
    const { core, cWETH } = await deploy();
    const cfg = await core.collateralConfigs(await cWETH.getAddress());
    expect(cfg.isActive).to.equal(true);
    expect(cfg.maxLtvBps).to.equal(7500);
  });

  it("agent deposits collateral and borrows confidentially; debt decrypts to a positive value", async () => {
    const { agent, cUSDT, cWETH, lending } = await deploy();
    const lendingAddr = await lending.getAddress();

    // approve lending as operator on collateral, then deposit 5 cWETH
    const until = Math.floor(Date.now() / 1000) + 3600;
    await (await cWETH.connect(agent).setOperator(lendingAddr, until)).wait();
    const dep = await enc(lendingAddr, agent.address, 5_000_000n);
    await (await lending.connect(agent).deposit(await cWETH.getAddress(), dep.handles[0], dep.inputProof)).wait();

    // borrow 1000 cUSDT against it
    const bor = await enc(lendingAddr, agent.address, 1000_000000n);
    await (await lending.connect(agent).borrow(await cUSDT.getAddress(), bor.handles[0], bor.inputProof)).wait();

    // the agent can decrypt their own debt; it should be > 0
    const debtHandle = await lending.totalBorrowOf(agent.address, await cUSDT.getAddress());
    const debt = await fhevm.userDecryptEuint(FhevmType.euint64, debtHandle, lendingAddr, agent);
    expect(debt).to.be.greaterThan(0n);
  });

  it("denies a borrow over the encrypted daily limit (grant == 0, indistinguishable on-chain)", async () => {
    const { agent, cUSDT, cWETH, lending } = await deploy();
    const lendingAddr = await lending.getAddress();
    const until = Math.floor(Date.now() / 1000) + 3600;

    // configure a small encrypted daily limit ($100), then try to borrow $1000
    const lim = await enc(lendingAddr, agent.address, 100_000000n);
    await (await lending.connect(agent).configureAgent(lim.handles[0], lim.inputProof, false, false)).wait();

    await (await cWETH.connect(agent).setOperator(lendingAddr, until)).wait();
    const dep = await enc(lendingAddr, agent.address, 5_000_000n);
    await (await lending.connect(agent).deposit(await cWETH.getAddress(), dep.handles[0], dep.inputProof)).wait();

    const bor = await enc(lendingAddr, agent.address, 1000_000000n);
    await (await lending.connect(agent).borrow(await cUSDT.getAddress(), bor.handles[0], bor.inputProof)).wait();

    const debtHandle = await lending.totalBorrowOf(agent.address, await cUSDT.getAddress());
    const debt = await fhevm.userDecryptEuint(FhevmType.euint64, debtHandle, lendingAddr, agent);
    expect(debt).to.equal(0n); // over-limit borrow grants nothing
  });

  it("repay reduces the encrypted debt", async () => {
    const { agent, cUSDT, cWETH, lending } = await deploy();
    const lendingAddr = await lending.getAddress();
    const usdt = await cUSDT.getAddress();
    const until = Math.floor(Date.now() / 1000) + 3600;

    await (await cWETH.connect(agent).setOperator(lendingAddr, until)).wait();
    const dep = await enc(lendingAddr, agent.address, 5_000_000n);
    await (await lending.connect(agent).deposit(await cWETH.getAddress(), dep.handles[0], dep.inputProof)).wait();

    const bor = await enc(lendingAddr, agent.address, 1000_000000n);
    await (await lending.connect(agent).borrow(usdt, bor.handles[0], bor.inputProof)).wait();

    const before = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await lending.totalBorrowOf(agent.address, usdt),
      lendingAddr,
      agent
    );

    // repay 400 cUSDT (agent must authorize lending to pull cUSDT)
    await (await cUSDT.connect(agent).setOperator(lendingAddr, until)).wait();
    const rep = await enc(lendingAddr, agent.address, 400_000000n);
    await (await lending.connect(agent).repay(usdt, rep.handles[0], rep.inputProof)).wait();

    const after = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await lending.totalBorrowOf(agent.address, usdt),
      lendingAddr,
      agent
    );
    expect(after).to.be.lessThan(before);
  });

  it("GAD cranks an over-leveraged position and seizes encrypted collateral", async () => {
    const { deployer, agent, cUSDT, cWETH, core, lending, gad } = await deploy();
    const lendingAddr = await lending.getAddress();
    const wethAddr = await cWETH.getAddress();
    const usdtAddr = await cUSDT.getAddress();
    const until = Math.floor(Date.now() / 1000) + 3600;

    // supply 5 cWETH (~$13k) and borrow 9000 cUSDT (healthy, ~69% LTV)
    await (await cWETH.connect(agent).setOperator(lendingAddr, until)).wait();
    const dep = await enc(lendingAddr, agent.address, 5_000_000n);
    await (await lending.connect(agent).deposit(wethAddr, dep.handles[0], dep.inputProof)).wait();
    const bor = await enc(lendingAddr, agent.address, 9000_000000n);
    await (await lending.connect(agent).borrow(usdtAddr, bor.handles[0], bor.inputProof)).wait();

    const collBefore = await fhevm.userDecryptEuint(
      FhevmType.euint64, await lending.totalCollateralOf(agent.address, wethAddr), lendingAddr, agent
    );
    expect(collBefore).to.equal(5_000_000n);

    // crash the cWETH price → position is now under-collateralized (~120% LTV → GAD-eligible)
    await (await core.connect(deployer).updatePrice(wethAddr, 1500_000000n)).wait();

    // enable GAD, wait out the cooldown, and crank (permissionless — anyone can call)
    await (await gad.connect(agent).configureGad(true, 0)).wait();
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await (await gad.connect(deployer).crank(agent.address)).wait();

    const collAfter = await fhevm.userDecryptEuint(
      FhevmType.euint64, await lending.totalCollateralOf(agent.address, wethAddr), lendingAddr, agent
    );
    expect(collAfter).to.be.lessThan(collBefore); // a slice was seized — leak-free, no plaintext revealed
  });
});
