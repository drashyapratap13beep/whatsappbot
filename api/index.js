const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Load Environment Variables from Vercel Dashboard
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my_diwali_bot_token_2026';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
const ACCESS_TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN;

// Meta Graph API Endpoint for sending WhatsApp messages
const getApiUrl = (phoneId) => `https://graph.facebook.com/v18.0/${phoneId || PHONE_NUMBER_ID}/messages`;

/**
 * -------------------------------------------------------------------
 * 1. WEBHOOK VERIFICATION (GET Request for Meta Verification)
 * -------------------------------------------------------------------
 */
app.get(['/webhook', '/api/index', '/'], (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WEBHOOK_VERIFIED SUCCESSFULLY');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ Verification failed. Token mismatch.');
      return res.sendStatus(403);
    }
  }
  return res.status(200).send('🌸 Diwali Dry Fruit WhatsApp Bot is live on Vercel!');
});

/**
 * -------------------------------------------------------------------
 * 2. INCOMING MESSAGES HANDLER (POST Request from Meta)
 * -------------------------------------------------------------------
 */
app.post(['/webhook', '/api/index', '/'], async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      const message = changes?.messages?.[0];

      if (message) {
        const from = message.from; // Customer's WhatsApp phone number
        const activePhoneId = changes?.metadata?.phone_number_id;

        // Determine user input type (Text, Button Tap, or List Item Selection)
        let incomingInput = '';
        if (message.type === 'text') {
          incomingInput = message.text.body.toLowerCase().trim();
        } else if (message.type === 'interactive') {
          if (message.interactive.type === 'button_reply') {
            incomingInput = message.interactive.button_reply.id.toLowerCase().trim();
          } else if (message.interactive.type === 'list_reply') {
            incomingInput = message.interactive.list_reply.id.toLowerCase().trim();
          }
        }

        console.log(`📩 Message from ${from}: ${incomingInput}`);

        // Route the message to appropriate response logic
        await handleMessageRouting(from, incomingInput, activePhoneId);
      }
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  } catch (error) {
    console.error('⚠️ Error processing incoming webhook:', error.response?.data || error.message);
    return res.sendStatus(500);
  }
});

/**
 * -------------------------------------------------------------------
 * 3. MAIN BOT DIALOGUE ROUTER & BOT LOGIC
 * -------------------------------------------------------------------
 */
async function handleMessageRouting(to, input, phoneId) {
  // A. MAIN MENU OR GREETINGS
  if (['hi', 'hello', 'namaste', 'start', 'menu', 'opt_main_menu'].some(keyword => input.includes(keyword))) {
    return sendMainMenu(to, phoneId);
  }

  // B. FESTIVE CATALOG & PRICE LIST
  if (['price', 'catalog', 'rates', 'items', 'opt_catalog'].some(keyword => input.includes(keyword))) {
    return sendInteractiveCatalogList(to, phoneId);
  }

  // C. ITEM SELECTION & ORDERING
  if (input.startsWith('item_')) {
    return handleItemOrder(to, input, phoneId);
  }

  // D. PAYMENT & UPI DETAILS
  if (['payment', 'pay', 'upi', 'bank', 'opt_payment'].some(keyword => input.includes(keyword))) {
    return sendPaymentDetails(to, phoneId);
  }

  // E. STORE LOCATION & TIMINGS
  if (['location', 'address', 'store', 'timing', 'hours', 'opt_location'].some(keyword => input.includes(keyword))) {
    return sendStoreLocationInfo(to, phoneId);
  }

  // F. TALK TO HUMAN SUPPORT
  if (['support', 'agent', 'help', 'human', 'call', 'opt_support'].some(keyword => input.includes(keyword))) {
    return sendHumanSupportInfo(to, phoneId);
  }

  // DEFAULT / FALLBACK FOR UNKNOWN INPUTS
  return sendFallbackMessage(to, phoneId);
}

/**
 * -------------------------------------------------------------------
 * 4. HELPER FUNCTIONS TO SEND VARIOUS WHATSAPP MESSAGE TYPES
 * -------------------------------------------------------------------
 */

// Helper to make POST requests to Meta Graph API
async function sendMetaMessage(payload, phoneId) {
  return axios({
    method: 'POST',
    url: getApiUrl(phoneId),
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    data: payload,
  });
}

// 1. Send Main Menu with Quick-Reply Interactive Buttons
async function sendMainMenu(to, phoneId) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: '🌸 Royal Dry Fruits - Diwali Collection 🎁'
      },
      body: {
        text: "Namaste! Welcome to Royal Dry Fruits.\n\nWe offer premium handpicked almonds, cashews, pistachios, and luxury Diwali gift hampers.\n\nHow can we help you today?"
      },
      footer: {
        text: "Select an option below to continue"
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: 'opt_catalog', title: '📜 View Catalog' }
          },
          {
            type: 'reply',
            reply: { id: 'opt_location', title: '📍 Store Location' }
          },
          {
            type: 'reply',
            reply: { id: 'opt_support', title: '💬 Talk to Us' }
          }
        ]
      }
    }
  };
  return sendMetaMessage(payload, phoneId);
}

// 2. Send Interactive List Menu for Products
async function sendInteractiveCatalogList(to, phoneId) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: '🎁 Diwali Festive Hampers & Rates'
      },
      body: {
        text: "Please select an item from our festive collection below to view details and place an order:"
      },
      footer: {
        text: "Free delivery on orders above ₹1,999"
      },
      action: {
        button: 'Browse Collection',
        sections: [
          {
            title: '✨ Festive Gift Boxes',
            rows: [
              { id: 'item_hamper_royal', title: '👑 Royal Grand Hamper', description: '₹1,999 | 1kg Mixed Nuts + Saffron + Dates' },
              { id: 'item_hamper_festive', title: '🌟 Festive Celebration', description: '₹1,199 | 750g Almonds, Cashews & Raisins' }
            ]
          },
          {
            title: '🥜 Premium Nuts (500g)',
            rows: [
              { id: 'item_almond', title: '🌰 California Almonds', description: '₹499 | Jumbo Grade 500g Pack' },
              { id: 'item_cashew', title: '⚪ Whole W240 Cashews', description: '₹549 | Export Quality 500g Pack' },
              { id: 'item_pista', title: '🟢 Roasted Pistachios', description: '₹599 | Salted Crunchy 500g Pack' }
            ]
          }
        ]
      }
    }
  };
  return sendMetaMessage(payload, phoneId);
}

// 3. Handle Item Selection Response
async function handleItemOrder(to, itemId, phoneId) {
  let itemDetails = '';
  
  switch(itemId) {
    case 'item_hamper_royal':
      itemDetails = '👑 *Royal Grand Gift Hamper*\n• Includes: Premium Almonds, Cashews, Pistachios, Persian Dates & Kashmiri Saffron\n• Price: ₹1,999';
      break;
    case 'item_hamper_festive':
      itemDetails = '🌟 *Festive Celebration Box*\n• Includes: California Almonds, Whole Cashews, Iranian Raisins\n• Price: ₹1,199';
      break;
    case 'item_almond':
      itemDetails = '🌰 *California Almonds (Jumbo)*\n• Weight: 500g Pack\n• Price: ₹499';
      break;
    case 'item_cashew':
      itemDetails = '⚪ *Whole W240 Cashews*\n• Weight: 500g Pack\n• Price: ₹549';
      break;
    case 'item_pista':
      itemDetails = '🟢 *Roasted Salted Pistachios*\n• Weight: 500g Pack\n• Price: ₹599';
      break;
    default:
      itemDetails = 'Dry Fruit Item';
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `You selected:\n\n${itemDetails}\n\nWould you like to confirm this order or check payment methods?`
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: 'opt_payment', title: '💳 Pay & Confirm' }
          },
          {
            type: 'reply',
            reply: { id: 'opt_catalog', title: '📜 Back to Catalog' }
          }
        ]
      }
    }
  };
  return sendMetaMessage(payload, phoneId);
}

// 4. Send Payment & Order Instructions
async function sendPaymentDetails(to, phoneId) {
  const messageText = 
    `💳 *Payment Details & UPI Information*\n\n` +
    `You can pay using any UPI app (GPay, PhonePe, Paytm):\n` +
    `👉 *UPI ID:* \`royaldryfruits@upi\`\n\n` +
    `*Order Instructions:*\n` +
    `1. Send the payment for your selected item.\n` +
    `2. Reply to this chat with a screenshot of the payment receipt.\n` +
    `3. Share your complete delivery address & phone number.\n\n` +
    `Our team will confirm your order within 15 minutes! 🚀`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: messageText }
  };
  return sendMetaMessage(payload, phoneId);
}

// 5. Send Store Location and Operating Hours
async function sendStoreLocationInfo(to, phoneId) {
  const locationText = 
    `📍 *Royal Dry Fruits Flagship Store*\n\n` +
    `🏢 *Address:* Shop #12, Commercial Market, Main Road, City Centre.\n` +
    `⏰ *Timings:* Monday – Sunday (10:00 AM – 9:00 PM)\n` +
    `📞 *Store Contact:* +91 98765 43210\n\n` +
    `Feel free to visit us directly for custom Diwali hamper packaging!`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: locationText }
  };
  return sendMetaMessage(payload, phoneId);
}

// 6. Send Human Support Details
async function sendHumanSupportInfo(to, phoneId) {
  const supportText = 
    `👨‍💼 *Customer Support*\n\n` +
    `Our team is available from 10:00 AM to 8:00 PM to answer custom bulk orders or corporate queries.\n\n` +
    `📞 Call/WhatsApp: +91 98765 43210\n` +
    `📧 Email: support@royaldryfruits.com\n\n` +
    `Or simply type your message here, and an agent will reply shortly!`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: supportText }
  };
  return sendMetaMessage(payload, phoneId);
}

// 7. Fallback for Unrecognized Inputs
async function sendFallbackMessage(to, phoneId) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: "I didn't quite catch that. Please tap one of the options below or type 'Price' to see our Diwali catalog."
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: 'opt_main_menu', title: '🏠 Main Menu' }
          },
          {
            type: 'reply',
            reply: { id: 'opt_catalog', title: '📜 View Price List' }
          }
        ]
      }
    }
  };
  return sendMetaMessage(payload, phoneId);
}

// Export the module for Vercel Serverless Function Execution
module.exports = app;