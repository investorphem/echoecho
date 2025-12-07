import OpenAI from 'openai';
import { neon } from '@neondatabase/serverless';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY missing' });
  }

  // Validate request method
  if (req.method !== 'POST') {
    console.warn(`Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, action = 'analyze_sentiment', posts, userAddress } = req.body;

  // Log request body for debugging
  console.log('AI analysis request:', { text, action, posts, userAddress });

  // Validate inputs
  if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.warn('Invalid or missing userAddress:', userAddress);
    return res.status(400).json({ error: 'Valid userAddress required' });
  }
  if (!['analyze_sentiment', 'find_counter_narratives'].includes(action)) {
    console.warn('Invalid action:', action);
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Define AI limits
  const aiLimits = { free: 10, premium: 'unlimited', pro: 'unlimited' };

  // Verify subscription and AI limits
  let userTier = 'free';
  let remainingAiCalls = aiLimits.free;
  try {
    const subscriptions = await sql`
      SELECT * FROM subscriptions
      WHERE wallet_address = ${userAddress.toLowerCase()}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (subscriptions.length > 0) {
      const sub = subscriptions[0];
      const expiresAt = new Date(sub.expires_at);
      const now = new Date();
      if (expiresAt > now) {
        userTier = sub.tier;
      }
    }

    console.log('User subscription tier:', userTier);

    if (aiLimits[userTier] !== 'unlimited') {
      // Check remaining AI calls
      const usage = await sql`
        SELECT ai_calls_used FROM user_usage
        WHERE wallet_address = ${userAddress.toLowerCase()}
        AND DATE_TRUNC('day', usage_date) = CURRENT_DATE
      `;

      let aiCallsUsed = usage.length > 0 ? usage[0].ai_calls_used : 0;
      remainingAiCalls = aiLimits[userTier] - aiCallsUsed;

      if (remainingAiCalls <= 0) {
        console.warn(`AI limit reached for user: ${userAddress}, tier: ${userTier}`);
        return res.status(429).json({
          error: `AI analysis limit reached for ${userTier} tier`,
          details: `You have reached your daily limit of ${aiLimits[userTier]} AI calls. Please upgrade to a higher tier.`,
        });
      }

      // Increment AI calls used
      try {
        await sql`
          INSERT INTO user_usage (wallet_address, usage_date, ai_calls_used)
          VALUES (${userAddress.toLowerCase()}, CURRENT_DATE, 1)
          ON CONFLICT (wallet_address, usage_date)
          DO UPDATE SET ai_calls_used = user_usage.ai_calls_used + 1
        `;
        console.log(`AI calls remaining for ${userAddress}: ${remainingAiCalls - 1}`);
      } catch (dbError) {
        console.error('Usage tracking error:', dbError.message);
        if (dbError.code === '42P01') {
          return res.status(500).json({
            error: 'Database configuration error',
            details: 'Usage tracking unavailable. Please initialize database with /api/init-db.',
          });
        }
        throw dbError; // Rethrow other errors
      }
    }
  } catch (error) {
    console.error('Subscription or usage check error:', error.message, { code: error.code });
    return res.status(500).json({
      error: 'Failed to verify subscription or usage',
      details: error.message,
      code: error.code || 'Unknown',
    });
  }

  try {
    if (action === 'analyze_sentiment') {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn('Invalid or missing text:', text);
        return res.status(400).json({ error: 'Valid text required' });
      }

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Analyze the sentiment and dominant viewpoint of this social media post. Return a JSON with: sentiment (positive/negative/neutral), dominant_view (brief description), confidence (0-1), and key_themes (array of 2-3 main topics).',
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      let analysis;
      try {
        analysis = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('JSON parsing error for sentiment analysis:', parseError.message);
        analysis = {
          sentiment: 'neutral',
          dominant_view: 'Unable to analyze due to parsing error',
          confidence: 0.5,
          key_themes: ['analysis_failed'],
        };
      }
      console.log('Sentiment analysis result:', analysis);
      return res.status(200).json(analysis);
    }

    if (action === 'find_counter_narratives') {
      if (!Array.isArray(posts) || posts.length === 0) {
        console.warn('Invalid or missing posts:', posts);
        return res.status(400).json({ error: 'Valid posts array required' });
      }

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Given these social media posts about a topic, identify which ones present counter-narratives or alternative viewpoints. Return JSON with: counter_posts (array of post indices that present different perspectives), main_narrative (dominant viewpoint), counter_themes (array of alternative viewpoints found).',
          },
          { role: 'user', content: JSON.stringify(posts) },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      let analysis;
      try {
        analysis = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('JSON parsing error for counter-narratives:', parseError.message);
        analysis = {
          counter_posts: [],
          main_narrative: 'Unable to analyze due to parsing error',
          counter_themes: ['analysis_failed'],
        };
      }
      console.log('Counter-narratives result:', analysis);
      return res.status(200).json(analysis);
    }
  } catch (error) {
    console.error('AI Analysis error:', error.message);
    if (error.status === 429 || error.message.includes('exceeded your current quota')) {
      console.warn(`OpenAI rate limit exceeded for user: ${userAddress}, action: ${action}`);
      // Roll back AI call increment
      if (aiLimits[userTier] !== 'unlimited') {
        try {
          await sql`
            UPDATE user_usage
            SET ai_calls_used = GREATEST(user_usage.ai_calls_used - 1, 0)
            WHERE wallet_address = ${userAddress.toLowerCase()}
            AND DATE_TRUNC('day', usage_date) = CURRENT_DATE
          `;
          console.log(`Rolled back AI call usage for ${userAddress}`);
        } catch (dbError) {
          console.error('Rollback error:', dbError.message);
        }
      }
      // Return fallback response
      if (action === 'analyze_sentiment') {
        return res.status(429).json({
          error: 'AI analysis temporarily unavailable due to rate limits',
          details: 'You have exceeded the OpenAI API quota. Please check your plan at https://platform.openai.com/account/billing.',
          sentiment: 'neutral',
          dominant_view: 'Rate limit fallback',
          confidence: 0.5,
          key_themes: ['rate_limited'],
        });
      } else if (action === 'find_counter_narratives') {
        return res.status(429).json({
          error: 'Counter-narratives unavailable due to rate limits',
          details: 'You have exceeded the OpenAI API quota. Please check your plan at https://platform.openai.com/account/billing.',
          counter_posts: [],
          main_narrative: 'Rate limit fallback',
          counter_themes: ['rate_limited'],
        });
      }
    }
    return res.status(500).json({
      error: 'Failed to process analysis',
      details: error.message || 'Unknown error',
    });
  }
}