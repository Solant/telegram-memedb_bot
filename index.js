const TelegramBot = require('node-telegram-bot-api');
const last = require('array-last');

const port = process.env.PORT || 8443;
const host = process.env.HOST;

const token = process.env.TELEGRAM_TOKEN;
const adminUserId = process.env.ADMIN_ID;

// Reinvented MongoDB in-memory storage service
let images = new Map();
let currentKey = 0;

const bot = new TelegramBot(token, {webHook: {port: port, host: host}});

bot.onText(/\/ping/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'pong');
});

bot.onText(/\/start/, (msg) => {
  const text = `Привет ${msg.from.first_name}, отправь мне смешную картинку и возможно она появится в твоем любимом (я на это надеюсь) паблосе.`;

  bot.sendMessage(msg.chat.id, text);
});

bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const imageId = last(msg.photo).file_id;

  bot.sendMessage(chatId, 'Картинка принята к рассмотрению');
  images.set(currentKey, {
    file_id: imageId,
    author: `${msg.from.first_name} ${msg.from.last_name}`,
  });

  bot.sendPhoto(adminUserId, imageId,
    {
      caption: `Подъехала картинка от ${msg.from.first_name}, публикуем?`,
      reply_markup: {
        inline_keyboard: [[
          {
            text: 'Да',
            callback_data: 'y' + currentKey,
          },
          {
            text: 'Неть',
            callback_data: 'n' + currentKey,
          }
        ]]
      }
    }
  );

  currentKey++;
});

bot.on('callback_query', (msg) => {
  const state = msg.data.charAt(0) === 'y';
  const id = Number.parseInt(msg.data.substring(1));

  // Reinvented passport authentication service 
  if (msg.from.id !== adminUserId) {
    bot.answerCallbackQuery(msg.id, 'Not authorized');
    return;
  }

  let callbackQueryText;
  if (images.has(id)) {
    callbackQueryText = state ? 'Опубликовано' : 'Удалено';
  } else {
    callbackQueryText = 'Картинка уже была опубликована либо сервер был перезапущен';
  }
  bot.answerCallbackQuery(msg.id, callbackQueryText);

  if (images.has(id) && state) {
    const o = images.get(id);
    bot.sendPhoto('@memedb', o.file_id, {
      caption: `Отправил ${o.author} через @memedb_bot`,
    });
  }

  images.delete(id);
});
