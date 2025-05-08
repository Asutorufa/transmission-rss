package main

import (
	"fmt"
	"log/slog"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

type Bot struct {
	bot    *tgbotapi.BotAPI
	chatId int64
}

func newBot(token string, chatid int64) (*Bot, error) {
	bot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		return nil, err
	}

	_, _ = bot.Request(tgbotapi.NewSetMyCommands(
		tgbotapi.BotCommand{Command: "chatid", Description: "get current chatid"},
		tgbotapi.BotCommand{Command: "userid", Description: "get current userid"},
		tgbotapi.BotCommand{Command: "refresh_immediate", Description: "refresh immediately"},
	))

	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	msgs := bot.GetUpdatesChan(u)

	go func() {
		for update := range msgs {
			switch update.Message.Command() {
			case "chatid":
				m := tgbotapi.NewMessage(update.Message.Chat.ID, fmt.Sprint(update.Message.Chat.ID))
				m.ReplyToMessageID = update.Message.MessageID
				if _, err := bot.Send(m); err != nil {
					slog.Error("send message failed", "err", err)
				}
			case "userid":
				m := tgbotapi.NewMessage(update.Message.Chat.ID, fmt.Sprint(update.Message.From.ID))
				m.ReplyToMessageID = update.Message.MessageID
				if _, err := bot.Send(m); err != nil {
					slog.Error("send message failed", "err", err)
				}

			case "refresh_immediate":
				if update.Message.From.ID != chatid {
					continue
				}
				var m tgbotapi.MessageConfig
				select {
				case ch <- struct{}{}:
					m = tgbotapi.NewMessage(update.Message.Chat.ID, "refresh immediately success")
					m.ReplyToMessageID = update.Message.MessageID
				case <-time.After(5 * time.Second):
					m = tgbotapi.NewMessage(update.Message.Chat.ID, "refresh immediately timeout")
					m.ReplyToMessageID = update.Message.MessageID
				}
				if _, err := bot.Send(m); err != nil {
					slog.Error("send message failed", "err", err)
				}
			default:
				continue
			}
		}
	}()
	return &Bot{
		bot:    bot,
		chatId: chatid,
	}, nil
}

func (b *Bot) SendMessage(text string) error {
	if b.chatId == 0 {
		return fmt.Errorf("chat id not set")
	}

	msg := tgbotapi.NewMessage(b.chatId, text)
	_, err := b.bot.Send(msg)
	return err
}
