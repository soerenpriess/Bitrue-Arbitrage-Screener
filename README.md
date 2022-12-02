# Bitrue-Arbitrage-Screener
![image](https://user-images.githubusercontent.com/56112882/205184606-c912aef8-11bf-4e30-8f8d-55a737048888.png)

No financial advices, for educational purposes only.

This is a screener bot for possible arbitrage gaps.
It is possible to output the current pairs with the resulting profits/losses. In addition, you can set all parameters yourself and run simulations on the live market. The results are logged in a txt to find the best currency with gaps. Once a vulnerability has been found, the bot can target that currency and notify you via Telegram as soon as an exploitable vulnerability arises.

This program also analyzes the order book prices in order to be able to provide the most accurate information possible. This is necessary because, for example, the price of a currency is $1000 but the next entry in the oderbook to buy is $1010. To counteract this, the base price is not used to calculate the estimated profit, but the next deposited order.

## Features 💱
      • blacklist unwanted currencies
      • telegram messages about potential arbitrage gaps
      • log possible arbitrage trades and the resulting balance
      • custom percentage profit to trigger
      • not only analyzes the current price, uses the order books and possible trades from them
      • set demo account assets to perform simulations on the live market
      
## Questions ⁉

### Why bitrue? 🛰
This question is very easy to answer. It makes more sense to take a smaller exchange with a little less volume and not a big baller exchange. For example, there are too many bots on Binance and this exchange is generally too big. This is purely a bot war. Many large companies use large exchanges with a lot of volume for this, for example Hyper Frequency Trading. You wouldn't have a chance here because this company would always outperform you due to the huge capital. It would be David versus Goliath and you would have to be very lucky to win this war.

### Which currency is best? 💲
There is no clear answer to that. This program was developed to find this out. I can only give you the tip, keep an eye out for small coins, but not too small, so that there is a certain volume to be able to trade properly.

### Why can't this program also trade? 🚫
This is not my intention. I don't want to take responsibility for your money. Everyone should do it themselves. You are welcome to implement it for yourself, not many steps are missing.

## Setup 🚀

### Install requirements
```bash
npm install
```

### config.js
```json
{
  "currency" : "ltc",
  "currencyBlacklist": [],
  "PercProfitToTrigger": 10,
  "LogTrades": true,
  "Telegram": {
    "Token": "Your-Token",
    "sendMessages": true,
    "messageId": "Your-MessageId"
  },
  "PercToTradeWith": 100,
  "DemoAccountValue" : 1000
}
```
currency: set the currency to be analyzed here

currencyBlacklist: Array of strings of currencies to be blacklisted

PercProfitToTrigger: Percent profit to simulate a trade

LogTrades: set here whether the data should be logged in log.txt

Telegram: set your token here, whether you want to receive notifications and your messageId

PercToTradeWith: Percentage of Account Value used to simulate

DemoAccountValue: Account value to simulate

## Get The Telegram Bot and your message Id 📫

You can find the Telegram Bot with the following name: @Bitrue_arbitrage_alerts_bot

To get your Telegram Message Id you have to start the program and send a message with '/messagedId' you will immediately receive a message with your Id which you can enter in the config.json.

![image](https://user-images.githubusercontent.com/56112882/205178601-e6479cd0-39d8-437f-b42c-5816b3293f75.png)


## Start Program 📈
```bash
npm start
```
After the start, a table should appear with all possible trading pairs of the currency previously specified in the config.
The arbitrage pairs are displayed with the associated prices and the resulting differences (dependent on DemoAccountValue and PercToTradeWith) with the resulting profit/loss.

As in the following picture.

![image](https://user-images.githubusercontent.com/56112882/205173330-d02cc1ca-916a-4aa4-a0a4-2f67100c23de.png)

## Log Trades 📖

### log.txt
Logging in text is good for finding arbitrage pairs. You can let the screener run for a few days and then get an evaluation of the possible trades that correspond to the previously set PercProfitToTrigger. (The difficulty is finding a suitable pair and/or running the screener at the appropriate time)

When a trade is recognized, it is stored in the following format.

![image](https://user-images.githubusercontent.com/56112882/205173883-25e5e6a1-5af4-4b23-aa22-6183b7ac6bde.png)

A timestamp is set in the first line.

In the second line, the pair for which the gap is to be used.

This is followed by trades and the order in which they must be executed (the starting and end value is always USDT!)

In this case btr would have to be bought first. This is done with USDT. The 'BUY btr' signal signals that this currency must be bought at the corresponding orderbook price. This means you would be able to buy a BTR for 0.03403 USDT.
Then LTC would have to be bought for BTR. This again signals us 'BUY ltc' and the pair 'ltc - btr'. The Orderbook price shows us here that we could buy an LTC for 2328.19 BTR.
This goes on until we get back to the base currency USDT.

The last row would show our AccountValue after the trade and the resulting profit. (In this case both 0$ because DemoAccountValue was set to 0 to get a quick simulation as an example)

### Telegram Logs 📲

You have been running possible trades for a suitable currency for a long time and logged them in log.txt. Now you've found a good pair and would like to take advantage of this gap.
You can use the Telegram Bot for this. The Telegram Bot sends you messages that have the same content as the logs in the log.txt. The difference is that you don't have to sit in front of your computer and constantly monitor the progress. As soon as there is a gap to trade, you will immediately receive a message with the pairs to be traded and can execute the trade.

## Updates
v1.0 = initialisation

v1.1 = Log trades

v1.2 = Telegram Bot log notifications


- last Update: 02.12.2022 - DD.MM.YYYY

