import OpenAI from 'openai';
import { getUserSubscription } from '../../lib/storage.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY missing' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, action = 'analyze_sentiment', posts, userAddress } = req.body;

  // Validate inputs
  if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Valid userAddress required' });
  }
  if (!['analyze_sentiment', 'find_counter_narratives'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Verify subscription for AI analysis
  const subscription = await getUserSubscription(userAddress.toLowerCase());
  const userTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
    ? subscription.tier
    : 'free';
  const aiLimits = { free: 10, premium: 'unlimited', pro: 'unlimited' };
  if (aiLimits[userTier] !== 'unlimited' && aiLimits[userTier] <= 0) {
    return res.status(403).json({ error: `AI analysis limit reached for ${userTier} tier` });
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
            content: 'Analyze the sentiment and dominant viewpoint of this social media post. Return a JSON with: sentiment (positive/negative/neutral), dominant_view (brief description), confidence (0-1), and key_themes (array of 2-3 main topics).'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      let analysis;
      try {
        analysis = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('JSON parsing error for sentiment analysis:', parseError);
        analysis = {
          sentiment: 'neutral',
          dominant_view: 'Unable to analyze due to parsing error',
          confidence: 0.5,
          key_themes: ['analysis_failed']
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
            content: 'Given these social media posts about a topic, identify which ones present counter-narratives or alternative viewpoints. Return JSON with: counter_posts (array of post indices that present different perspectives), main_narrative (dominant viewpoint), counter_themes (alternative viewpoints found).'
          },
          {
            role: 'user',
            content: JSON.stringify(posts)
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      let analysis;
      try {
        analysis = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('JSON parsing error for counter-narratives:', parseError);
        analysis = {
          counter_posts: [],
          main_narrative: 'Unable to analyze due to parsing error',
          counter_themes: ['analysis_failed']
        };
      }
      return res.status(200).json(analysis);
    }
  } catch (error) {
    console.error('AI Analysis error:', error);
    return res.status(500).json({
      error: 'Failed to process analysis',
      details: error.message || 'Unknown error'
    });
  }
}