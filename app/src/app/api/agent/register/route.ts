import { NextResponse } from 'next/server';
import { addAgentToWaitlist, getAgentStats } from '@/lib/waitlist';

/**
 * AI Agent Registration Endpoint
 * 
 * POST /api/agent/register - Register your agent on the Obscura waitlist
 * GET  /api/agent/register - Get waitlist stats & endpoint documentation
 * 
 * @see https://docs.obscura.io/agents
 */

// ============================================================================
// GET - Endpoint discovery & stats (agent-friendly)
// ============================================================================
export async function GET() {
  try {
    const stats = await getAgentStats();
    
    return NextResponse.json({
      name: 'Obscura Agent Registration API',
      version: '1.0.0',
      description: 'Register your AI agent for priority access to Obscura credit protocol',
      
      // Waitlist stats
      stats: {
        totalAgents: stats.totalAgents,
        totalHumans: stats.totalHumans,
        totalWaitlist: stats.totalAgents + stats.totalHumans,
        recentAgents: stats.recentAgents,
      },
      
      // How to register
      register: {
        method: 'POST',
        endpoint: '/api/agent/register',
        contentType: 'application/json',
        required: {
          walletAddress: 'string - Your EVM wallet address (0x...)',
          agentName: 'string - Your agent identifier',
        },
        optional: {
          agentDescription: 'string - What does your agent do?',
          useCase: 'string - How will you use Obscura credit?',
          referralCode: 'string - Referral code from another user',
        },
        example: {
          walletAddress: '0x1234...abcd',
          agentName: 'ArbitrageBot',
          agentDescription: 'Autonomous DeFi arbitrage agent',
          useCase: 'Flash credit for MEV opportunities',
          referralCode: 'ABC123',
        },
      },
      
      // Benefits
      benefits: [
        '🎯 Priority access to Obscura credit protocol',
        '💰 Agent-optimized borrowing terms',
        '⚡ Sub-second credit decisions',
        '🔗 x402 payment protocol ready',
        '📊 On-chain reputation building',
      ],
      
      // Links
      links: {
        docs: 'https://docs.obscura.io/agents',
        website: 'https://evm.obscura.io',
        twitter: 'https://x.com/big14way',
      },
      
      // Call to action
      cta: stats.totalAgents > 0 
        ? `${stats.totalAgents} agents already registered. Join them!`
        : 'Be the first agent to join Obscura!',
    });
  } catch (error) {
    console.error('Agent stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Agent registration
// ============================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, agentName, agentDescription, useCase, referralCode } = body;

    // Validation with helpful hints
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'walletAddress is required',
          hint: 'Provide your EVM wallet address (0x...)',
          example: '0x1234567890abcdef1234567890abcdef12345678',
        },
        { status: 400 }
      );
    }

    // Basic wallet validation (EVM address)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid wallet address format',
          hint: 'EVM addresses are 42 chars, hex prefixed with 0x',
        },
        { status: 400 }
      );
    }

    if (!agentName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'agentName is required',
          hint: 'What should we call your agent?',
          example: 'TradingBot-v2',
        },
        { status: 400 }
      );
    }

    if (agentName.length > 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'agentName too long',
          hint: 'Maximum 50 characters',
        },
        { status: 400 }
      );
    }

    // Register the agent
    const result = await addAgentToWaitlist({
      walletAddress,
      agentName,
      agentDescription,
      useCase,
      referralCode,
    });

    if (!result.success) {
      // Already registered - return helpful info
      if (result.error === 'Wallet already registered' && result.entry) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Wallet already registered',
            message: 'This wallet is already on the waitlist!',
            data: {
              referralCode: result.entry.code,
              referralLink: `https://agentic.obscura.io/waitlist?ref=${result.entry.code}`,
              tip: 'Share your referral code to move up the waitlist!',
            }
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Success!
    return NextResponse.json({
      success: true,
      message: `Welcome to Obscura, ${agentName}! 🤖`,
      data: {
        referralCode: result.entry!.code,
        referralLink: `https://agentic.obscura.io/waitlist?ref=${result.entry!.code}`,
        
        // What they get
        benefits: [
          '🎯 Priority access to Obscura credit protocol',
          '💰 Agent-optimized borrowing terms',
          '⚡ Sub-second credit decisions',
          '🔗 x402 payment protocol integration',
        ],
        
        // What to do next
        nextSteps: [
          {
            action: 'Share your referral code',
            why: 'Move up the waitlist faster',
            code: result.entry!.code,
          },
          {
            action: 'Follow @big14way',
            why: 'Get launch updates',
            link: 'https://x.com/big14way',
          },
        ],
      },
    }, { status: 201 });
  } catch (error) {
    // Handle JSON parse errors gracefully
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body',
          hint: 'Make sure Content-Type is application/json',
        },
        { status: 400 }
      );
    }
    
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
