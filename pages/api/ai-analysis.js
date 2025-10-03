import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import { getUserSubscription, getApiCallsUsed, incrementApiCalls } from '../../../lib/storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY missing' });
  }

  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secure-secret');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', details: error.message });
  }

  const { text, action = 'analyze_sentiment', posts, userAddress } = req.body;

  // Validate inputs
  if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/) || userAddress.toLowerCase() !== decoded.address.toLowerCase()) {
    return res.status(400).json({ error: 'Valid and authorized userAddress required' });
  }
  if (!['analyze_sentiment', 'find_counter_narratives'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const userKey = userAddress.toLowerCase();

  // Define AI limits
  const aiLimits = { free: 10, premium: 'unlimited', pro: 'unlimited' };

  // Verify subscription and AI limits
  let userTier = 'free';
  let remainingAiCalls = aiLimits.free;
  try {
    const subscription = await getUserSubscription(userKey);
    if (subscription && new Date(subscription.expires_at) > new Date()) {
      userTier = subscription.tier;
    }

    if (aiLimits[userTier] !== 'unlimited') {
      const aiCallsUsed = await getApiCallsUsed(userKey, 'ai');
      remainingAiCalls = aiLimits[userTier] - aiCallsUsed;

      if (remainingAiCalls <= 0) {
        return res.status(429).json({
          error: `AI analysis limit reached for ${userTier} tier`,
          details: `You have reached your daily limit of ${aiLimits[userTier]} AI calls. Please upgrade to a higher tier.`,
        });
      }

      await incrementApiCalls(userKey, 'ai');
    }
  } catch (error) {
    if (error.message.includes('user_usage table does not exist')) {
      return res.status(500).json({
        error: 'Database configuration error',
        details: 'Usage tracking unavailable. Please initialize database with /api/init-db.',
      });
    }
    return res.status(500).json({
      error: 'Failed to verify subscription or usage',
      details: error.message,
    });
  }

  try {
    if (action === 'analyze_sentiment') {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
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
        analysis = {
          sentiment: 'neutral',
          dominant_view: 'Unable to analyze due to parsing error',
          confidence: 0.5,
          key_themes: ['analysis_failed'],
        };
      }
      return res.status(200).json(analysis);
    }

    if (action === 'find_counter_narratives') {
      if (!Array.isArray(posts) || posts.length === 0) {
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
        analysis = {
          counter_posts: [],
          main_narrative: 'Unable to analyze due to parsing error',
          counter_themes: ['analysis_failed'],
        };
      }
      return res.status(200).json(analysis);
    }
  } catch (error) {
    if (error.status === 429 || error.message.includes('exceeded your current quota')) {
      // Roll back AI call increment
      if (aiLimits[userTier] !== 'unlimited') {
        try {
          await incrementApiCalls(userKey, 'ai', -1); // Custom function to decrement
        } catch (dbError) {
          // Suppress rollback error to avoid masking primary error
        }
      }
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