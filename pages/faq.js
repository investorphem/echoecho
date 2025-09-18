import { useState } from 'react';

const FAQSection = ({ question, answer, isOpen, onToggle }) => (
  <div style={{
    border: '1px solid #374151',
    borderRadius: '8px',
    marginBottom: '12px',
    backgroundColor: '#1f2937'
  }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        padding: '16px',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {question}
      <span style={{ fontSize: '20px' }}>{isOpen ? '−' : '+'}</span>
    </button>
    {isOpen && (
      <div style={{
        padding: '0 16px 16px',
        color: '#d1d5db',
        lineHeight: '1.6'
      }}>
        {answer}
      </div>
    )}
  </div>
);

export default function FAQ() {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (index) => {
    setOpenSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqData = [
    {
      question: "🌟 What is EchoEcho?",
      answer: (
        <div>
          <p><strong>EchoEcho is an AI-powered Farcaster miniapp that breaks echo chambers by discovering counter-narratives from multiple platforms.</strong></p>
          <br />
          <p>Instead of staying in your usual bubble, EchoEcho finds opposing viewpoints from:</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>🟣 <strong>Farcaster</strong> - Alternative perspectives in the decentralized social space</li>
            <li>🔵 <strong>X (Twitter)</strong> - Diverse opinions from global conversations</li>
            <li>📰 <strong>News Sources</strong> - Professional journalism with different angles</li>
          </ul>
          <br />
          <p>When you discover valuable counter-narratives, you earn <strong>Insight Token NFTs on Base blockchain</strong> and can echo the content to your network!</p>
        </div>
      )
    },
    {
      question: "💰 How do I earn money as a user?",
      answer: (
        <div>
          <p><strong>EchoEcho offers multiple ways to earn as you break echo chambers:</strong></p>
          <br />
          <div style={{ marginLeft: '16px' }}>
            <p><strong>🎯 Echo Rewards:</strong> $0.01 per echo you make</p>
            <p><strong>🎨 NFT Trading:</strong> Sell your Insight Tokens on OpenSea (Base network)</p>
            <p><strong>💎 Rarity Bonuses:</strong> Legendary NFTs can sell for $50+</p>
            <p><strong>🔗 Referral Income:</strong> 10% of referred users' subscription fees</p>
            <p><strong>📈 Viral Bonuses:</strong> Extra rewards when your echoes go viral</p>
            <p><strong>🏆 Pro Revenue Sharing:</strong> Pro users get 15% of platform revenue from users they refer</p>
          </div>
          <br />
          <p><strong>Estimated Monthly Earnings:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>🥉 <strong>Active User:</strong> $10-50/month</li>
            <li>🥈 <strong>Engaged User:</strong> $50-200/month</li>
            <li>🥇 <strong>Power User:</strong> $200-1000+/month</li>
          </ul>
        </div>
      )
    },
    {
      question: "🔄 What are the subscription tiers?",
      answer: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '8px' }}>🆓 FREE EXPLORER ($0/month)</h4>
            <ul style={{ marginLeft: '20px', color: '#d1d5db' }}>
              <li>✅ Basic trending casts</li>
              <li>✅ 5 echoes per day</li>
              <li>✅ Standard NFT minting (common rarity only)</li>
              <li>✅ Basic counter-narratives from Farcaster</li>
              <li>❌ Cross-platform global echoes</li>
              <li>❌ Premium NFT rarities</li>
            </ul>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#a78bfa', marginBottom: '8px' }}>💎 ECHO BREAKER ($7 USDC/month)</h4>
            <ul style={{ marginLeft: '20px', color: '#d1d5db' }}>
              <li>✅ <strong>Unlimited echoes</strong></li>
              <li>✅ Advanced AI analysis</li>
              <li>✅ <strong>Cross-platform global echoes</strong> (X + News)</li>
              <li>✅ Premium NFT rarities (rare, epic)</li>
              <li>✅ Priority counter-narrative discovery</li>
              <li>✅ Echo analytics dashboard</li>
              <li>✅ Custom echo badges</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ color: '#fbbf24', marginBottom: '8px' }}>👑 ECHO MASTER ($25 USDC/month)</h4>
            <ul style={{ marginLeft: '20px', color: '#d1d5db' }}>
              <li>✅ <strong>All Premium features</strong></li>
              <li>✅ <strong>Legendary NFT rarity access</strong> (most valuable)</li>
              <li>✅ API access for developers</li>
              <li>✅ White-label echo solutions</li>
              <li>✅ Advanced echo chamber analytics</li>
              <li>✅ Priority customer support</li>
              <li>✅ <strong>Revenue sharing on viral echoes</strong></li>
            </ul>
          </div>
        </div>
      )
    },
    {
      question: "💳 How do I pay with USDC on Base?",
      answer: (
        <div>
          <p><strong>EchoEcho uses USDC payments on Base blockchain for fast, cheap transactions:</strong></p>
          <br />
          <div style={{ backgroundColor: '#1e40af', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <p><strong>🔗 Payment Process:</strong></p>
            <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Select your subscription tier</li>
              <li>Get the payment address and amount</li>
              <li>Send USDC from your Base wallet</li>
              <li>Your subscription activates automatically</li>
            </ol>
          </div>
          
          <p><strong>💰 USDC Amounts:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>Echo Breaker: <strong>7 USDC</strong> per month</li>
            <li>Echo Master: <strong>25 USDC</strong> per month</li>
          </ul>
          <br />
          
          <p><strong>🌐 Why Base Network?</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>⚡ Ultra-low fees (under $0.01)</li>
            <li>🚀 Fast transactions (2-3 seconds)</li>
            <li>🔒 Ethereum security</li>
            <li>🎨 Same network as your NFTs</li>
          </ul>
        </div>
      )
    },
    {
      question: "🎨 What are Insight Token NFTs?",
      answer: (
        <div>
          <p><strong>Insight Tokens are NFTs you earn for discovering valuable counter-narratives:</strong></p>
          <br />
          
          <div style={{ marginBottom: '12px' }}>
            <p><strong>🎯 Rarity Tiers & Values:</strong></p>
            <ul style={{ marginLeft: '20px' }}>
              <li>⚪ <strong>Common:</strong> $2-5 (Free tier)</li>
              <li>🔵 <strong>Rare:</strong> $8-15 (Premium tier)</li>
              <li>🟣 <strong>Epic:</strong> $20-40 (Premium tier)</li>
              <li>🟡 <strong>Legendary:</strong> $50-200+ (Pro tier only)</li>
            </ul>
          </div>
          
          <p><strong>📈 What affects rarity?</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>Quality of counter-narrative discovered</li>
            <li>Engagement your echo receives</li>
            <li>How different the perspective is from mainstream</li>
            <li>Timing of discovery (early = rarer)</li>
          </ul>
          <br />
          
          <p><strong>💎 NFT Benefits:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>🏪 Tradeable on OpenSea</li>
            <li>🎯 Proof of diverse thinking</li>
            <li>🏆 Collector status in community</li>
            <li>💰 Potential for price appreciation</li>
          </ul>
        </div>
      )
    },
    {
      question: "🔓 What premium features do I get?",
      answer: (
        <div>
          <p><strong>Premium subscriptions unlock powerful echo-breaking features:</strong></p>
          <br />
          
          <div style={{ backgroundColor: '#7c3aed', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <p><strong>🌍 Cross-Platform Global Echoes (Premium/Pro only):</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Break out of Farcaster-only bubble</li>
              <li>Discover counter-narratives from X and News</li>
              <li>Get global perspective on any topic</li>
            </ul>
          </div>
          
          <div style={{ backgroundColor: '#059669', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <p><strong>🤖 Advanced AI Analysis (Premium/Pro only):</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Deeper sentiment analysis</li>
              <li>Better counter-narrative detection</li>
              <li>Bias identification in content</li>
            </ul>
          </div>
          
          <div style={{ backgroundColor: '#dc2626', padding: '12px', borderRadius: '6px' }}>
            <p><strong>👑 Pro-Only Features:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>API access for developers</li>
              <li>Revenue sharing (15% of referrals)</li>
              <li>Legendary NFT access</li>
              <li>White-label solutions</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      question: "📊 How do echo analytics work?",
      answer: (
        <div>
          <p><strong>Premium users get detailed analytics to optimize their echo strategy:</strong></p>
          <br />
          
          <p><strong>📈 Your Echo Dashboard shows:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>🎯 <strong>Echo Performance:</strong> Views, reactions, reshares</li>
            <li>💰 <strong>Earnings Breakdown:</strong> NFT sales, echo rewards, bonuses</li>
            <li>🌟 <strong>Diversity Score:</strong> How well you break echo chambers</li>
            <li>🏆 <strong>Rarity Stats:</strong> Your NFT collection value</li>
            <li>📊 <strong>Weekly Trends:</strong> Best performing echo types</li>
            <li>🎪 <strong>Viral Tracker:</strong> Which echoes are spreading</li>
          </ul>
          <br />
          
          <p><strong>💡 Use analytics to:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>Time your echoes for maximum impact</li>
            <li>Find your most valuable counter-narrative types</li>
            <li>Track your earnings growth</li>
            <li>Optimize for higher NFT rarities</li>
          </ul>
        </div>
      )
    },
    {
      question: "❓ How do I get started?",
      answer: (
        <div>
          <p><strong>Start breaking echo chambers in 3 simple steps:</strong></p>
          <br />
          
          <div style={{ backgroundColor: '#1e40af', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <p><strong>1️⃣ Connect Your Wallet</strong></p>
            <p>Connect your Base-compatible wallet to mint NFTs and receive payments</p>
          </div>
          
          <div style={{ backgroundColor: '#059669', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <p><strong>2️⃣ Start Exploring (Free)</strong></p>
            <p>Browse trending casts and try finding counter-narratives - you get 5 free echoes daily!</p>
          </div>
          
          <div style={{ backgroundColor: '#7c3aed', padding: '12px', borderRadius: '6px' }}>
            <p><strong>3️⃣ Upgrade for More Power</strong></p>
            <p>Send USDC to unlock cross-platform echoes, premium NFTs, and unlimited access</p>
          </div>
          
          <br />
          <p><strong>💡 Pro Tips:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>Start with Free tier to learn the system</li>
            <li>Focus on quality over quantity for better NFT rarities</li>
            <li>Share your best echoes to build a following</li>
            <li>Upgrade to Premium once you're earning consistently</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '16px', background: 'linear-gradient(45deg, #60a5fa, #a78bfa)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            🌟 EchoEcho FAQ
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8' }}>
            Everything you need to know about breaking echo chambers and earning with EchoEcho
          </p>
        </div>

        <div>
          {faqData.map((faq, index) => (
            <FAQSection
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openSections[index]}
              onToggle={() => toggleSection(index)}
            />
          ))}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          padding: '24px',
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          border: '2px solid #3b82f6'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#60a5fa' }}>Ready to break some echo chambers? 🚀</h3>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transform: 'translateY(0)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            🌟 Start Echoing Now
          </button>
        </div>
      </div>
    </div>
  );
}