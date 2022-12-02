const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');

const config = require("./config");

const app = express();
const port = 3002;
const bot = new TelegramBot(config.Telegram.Token, {polling: true});
let prices;
let pairs;
let table;
let startBalance = (config.DemoAccountValue / 100) * config.PercToTradeWith;
let telegramMessageId = config.Telegram.messageId;

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
    main();
});

/**
 * The main function will first reset the arrays and fill them after that
 * again by calling the function "BitrueGetAllCurrencyPairs();" with the currency pairs and the associated prices. This happens in "BitrueGetAllCurrencyPairs();"
 * After that the arrays get sorted by "BubbleSort" and stored in
 * tradablePairsSorted.
 * Now the table get created and printed in the console.
 * The function calls itself after its finished.
 *
 * @returns {Promise<void>}
 */
async function main(){
    prices = [];
    pairs = [];
    table = [];

    await BitrueGetAllCurrencyPairs(config.currency);
    let tradablePairsSorted = await BubbleSort(prices,pairs);

    if(pairs.length % 2 === 0){
        for(let i = 0; i < pairs.length/2; i++){
            await createTable(tradablePairsSorted.StockPrices, tradablePairsSorted.StockPairs, i);
        }
    }else{
        for(let i = 0; i < (pairs.length-1)/2; i++){
            await createTable(tradablePairsSorted.StockPrices, tradablePairsSorted.StockPairs, i);
        }
    }
    await printTable(table);

    main();
}


/**
 * Uses the passed data to create a table in the console.
 *
 * @param table
 * @returns {Promise<void>}
 */
async function printTable(table){
    console.clear();
    console.table(table)
}


/**
 *  Fill the array `table` with JSON that contains the table rows.
 *
 * @param price
 * @param pair
 * @param count
 * @returns {Promise<void>}
 */
async function createTable(price, pair, count) {
    //console.log(pair[count], pair[((pair.length-1)-count)]);
    let estProf = await estimatedProfit(pair[count], pair[((pair.length-1)-count)]);
    //console.log(estProf)
    table[count] = {StockA: pair[count], PriceA: price[count], StockB: pair[((pair.length-1)-count)], PriceB: price[((price.length-1)-count)], Difference: relDif(price[count], price[((price.length-1)-count)]).toFixed(4) + "%", EstimatedProfit : estProf + " $"};
}


/**
 * Just a BubbleSort.
 *
 * @param price
 * @param pair
 * @returns {Promise<JSON>}
 * @constructor
 */
async function BubbleSort(price, pair) {
    return new Promise(async function (resolve) {
        let len = price.length;
        for (let i = len - 1; i >= 0; i--) {
            for (let j = 1; j <= i; j++) {
                if (price[j - 1] > price[j]) {
                    let temp = price[j - 1];
                    price[j - 1] = price[j];
                    price[j] = temp;

                    let temp1 = pair[j - 1];
                    pair[j - 1] = pair[j];
                    pair[j] = temp1;
                }
            }
        }
        resolve({
            StockPrices: price,
            StockPairs: pair
        });
    });
}


async function estimatedProfit(stockA, stockB) {

    let stockAFirst = stockA.split("/"[0])[0];
    let stockASecond = stockA.split("/"[0])[1];

    let stockBFirst = stockB.split("/"[0])[0];
    let stockBSecond = stockB.split("/"[0])[1];

    let estValueAfterTrade;
    let triggerProfit = config.PercProfitToTrigger;
    let currencyArr = [];
    let logTrades = config.LogTrades;
    let logTradesTelegram = config.Telegram.sendMessages;
    let dateTime

    currencyArr[0] = stockAFirst;
    currencyArr[1] = stockASecond;
    currencyArr[2] = stockBFirst;
    currencyArr[3] = stockBSecond;

    if(logTrades){
        let date_ob = new Date();
        dateTime = date_ob.getFullYear() + "-" + ("0" + (date_ob.getMonth() + 1)).slice(-2) + "-" + ("0" + date_ob.getDate()).slice(-2) + " " + ("0" + (date_ob.getHours())).slice(-2) + ":" + ("0" + (date_ob.getMinutes())).slice(-2) + ":" + ("0" + (date_ob.getSeconds())).slice(-2)
        var logStream = fs.createWriteStream('log.txt', {flags: 'a'});
    }

    if (stockASecond.toUpperCase() === "USDT".toUpperCase()) {
        let firstTrade = await BitrueOrderBook(stockAFirst + stockASecond);
        let secondTrade = await BitrueOrderBook(stockBFirst + stockBSecond);
        let thirdTrade = await BitrueOrderBook(stockBSecond + "usdt");

        estValueAfterTrade = ((startBalance / parseFloat(firstTrade.asks[0][0])) * parseFloat(secondTrade.bids[0][0])) * parseFloat(thirdTrade.bids[0][0]);

        if(logTrades && await diff(estValueAfterTrade, startBalance) >= triggerProfit){
        await logStream.write(`        -------------------\n
        ${dateTime}\n
        Trade between ${stockA} and ${stockB}\n
        1: ${stockAFirst} - ${stockASecond}   BUY ${stockAFirst}   Orderbook price: ${JSON.stringify(firstTrade.asks[0][0])}\n
        2: ${stockBFirst} - ${stockBSecond}   SELL ${stockBSecond}   Orderbook price: ${JSON.stringify(secondTrade.bids[0][0])}\n
        3: ${stockBSecond} - usdt   SELL usdt  Orderbook price: ${JSON.stringify(thirdTrade.bids[0][0])}\n
        Estimated value after Trade: ${estValueAfterTrade.toFixed(2)} $      Estimated profit: ${(estValueAfterTrade - startBalance).toFixed(2)} $
        `);
        await logStream.end('-------------------\n\n');
        }

        if(logTradesTelegram && config.Telegram.Token != "" && telegramMessageId != ""  && await diff(estValueAfterTrade, startBalance) >= triggerProfit){
            bot.sendMessage(telegramMessageId, `-------------------\n${dateTime}\n`+
            `Trade between ${stockA} and ${stockB}\n`+
            `1: ${stockAFirst} - ${stockASecond}   BUY ${stockAFirst}   Orderbook price: ${JSON.stringify(firstTrade.asks[0][0])}\n`+
            `2: ${stockBFirst} - ${stockBSecond}   SELL ${stockBSecond}   Orderbook price: ${JSON.stringify(secondTrade.bids[0][0])}\n`+
            `3: ${stockBSecond} - usdt   SELL usdt  Orderbook price: ${JSON.stringify(thirdTrade.bids[0][0])}\n`+
            `Estimated value after Trade: ${estValueAfterTrade.toFixed(2)} $      Estimated profit: ${(estValueAfterTrade - startBalance).toFixed(2)} $\n`+
            `-------------------\n\n`);
        }

    } else if (stockBSecond.toUpperCase() === "USDT".toUpperCase()) {
        let firstTrade = await BitrueOrderBook(stockASecond + "usdt");
        let secondTrade = await BitrueOrderBook(stockAFirst + stockASecond);
        let thirdTrade = await BitrueOrderBook(stockBFirst + stockBSecond);

        estValueAfterTrade = await (((startBalance / parseFloat(firstTrade.asks[0][0])) / parseFloat(secondTrade.asks[0][0])) * parseFloat(thirdTrade.bids[0][0]));

        if(logTrades && await diff(estValueAfterTrade, startBalance) >= triggerProfit){
        await logStream.write(`        -------------------\n
        ${dateTime}\n
        Trade between ${stockA} and ${stockB}\n
        1: ${stockASecond} - usdt   BUY ${stockASecond}   Orderbook price: ${JSON.stringify(firstTrade.asks[0][0])}\n
        2: ${stockAFirst} - ${stockASecond}   BUY ${stockAFirst}   Orderbook price: ${JSON.stringify(secondTrade.asks[0][0])}\n
        3: ${stockBFirst} - ${stockBSecond}   SELL ${stockBSecond}   Orderbook price: ${JSON.stringify(thirdTrade.bids[0][0])}\n
        Estimated value after Trade: ${estValueAfterTrade} $      Estimated profit: ${estValueAfterTrade - startBalance} $
        `);
        await logStream.end('-------------------\n\n');
        }

        if(logTradesTelegram && config.Telegram.Token != "" && telegramMessageId != "" && await diff(estValueAfterTrade, startBalance) >= triggerProfit){
            bot.sendMessage(telegramMessageId, `-------------------\n${dateTime}\n`+
            `Trade between ${stockA} and ${stockB}\n`+
            `1: ${stockASecond} - usdt   BUY ${stockASecond}   Orderbook price: ${JSON.stringify(firstTrade.asks[0][0])}\n`+
            `2: ${stockAFirst} - ${stockASecond}   BUY ${stockAFirst}   Orderbook price: ${JSON.stringify(secondTrade.bids[0][0])}\n`+
            `3: ${stockBFirst} - ${stockBSecond}   SELL ${stockBSecond}  Orderbook price: ${JSON.stringify(thirdTrade.bids[0][0])}\n`+
            `Estimated value after Trade: ${estValueAfterTrade.toFixed(2)} $      Estimated profit: ${(estValueAfterTrade - startBalance).toFixed(2)} $\n`+
            `-------------------\n\n`);
        }

    } else {
        let firstTrade = await BitrueOrderBook(stockASecond + "usdt");
        let secondTrade = await BitrueOrderBook(stockAFirst + stockASecond);
        let thirdTrade = await BitrueOrderBook(stockBFirst + stockBSecond);
        let fourthTrade = await BitrueOrderBook(stockBSecond + "usdt");

        estValueAfterTrade = await ((((startBalance / parseFloat(firstTrade.asks[0][0])) / parseFloat(secondTrade.asks[0][0])) * parseFloat(thirdTrade.bids[0][0])) * parseFloat(fourthTrade.bids[0][0]));

        if(logTrades && await diff(estValueAfterTrade, startBalance) >= triggerProfit){
        await logStream.write(`        -------------------\n
        ${dateTime}\n
        Trade between ${stockA} and ${stockB}\n
        1: ${stockASecond} - usdt   BUY ${stockASecond}   Orderbook price: ${JSON.stringify(firstTrade.asks[0][0])}\n
        2: ${stockAFirst} - ${stockASecond}   BUY ${stockAFirst}   Orderbook price: ${JSON.stringify(secondTrade.asks[0][0])}\n
        3: ${stockBFirst} - ${stockBSecond}   SELL ${stockBSecond}   Orderbook price: ${JSON.stringify(thirdTrade.bids[0][0])}\n
        4: ${stockBSecond} - usdt   SELL usdt  Orderbook price: ${JSON.stringify(fourthTrade.bids[0][0])}\n
        Estimated value after Trade: ${estValueAfterTrade} $      Estimated profit: ${estValueAfterTrade - startBalance} $
        `);
        await logStream.end('-------------------\n\n');
        }

        if(logTradesTelegram && config.Telegram.Token != "" && telegramMessageId != "" && await diff(estValueAfterTrade, startBalance) >= triggerProfit){
            bot.sendMessage(telegramMessageId, `-------------------\n${dateTime}\n`+
            `Trade between ${stockA} and ${stockB}\n`+
            `1: ${stockASecond} - usdt   BUY ${stockASecond}   Orderbook price: ${JSON.stringify(firstTrade.asks[0][0])}\n`+
            `2: ${stockAFirst} - ${stockASecond}   BUY ${stockAFirst}   Orderbook price: ${JSON.stringify(secondTrade.asks[0][0])}\n`+
            `3: ${stockBFirst} - ${stockBSecond}   SELL ${stockBSecond}   Orderbook price: ${JSON.stringify(thirdTrade.bids[0][0])}\n`+
            `4: ${stockBSecond} - usdt   SELL usdt  Orderbook price: ${JSON.stringify(fourthTrade.bids[0][0])}\n`+
            `Estimated value after Trade: ${estValueAfterTrade.toFixed(2)} $      Estimated profit: ${(estValueAfterTrade - startBalance).toFixed(2)} $\n`+
            `-------------------\n\n`);
        }
    }
    let estimatedProfit = (estValueAfterTrade - startBalance).toFixed(4);
    if(logTrades && await diff(estValueAfterTrade, startBalance) >= triggerProfit) startBalance  = estValueAfterTrade
    return estimatedProfit
}

function relDif(stockA, stockB){
    if(stockA > stockB){
        return ((stockA - stockB) / stockB) * 100;
    }else if(stockB > stockA){
        return ((stockB - stockA) / stockA) * 100;
    }else{
        return 0;
    }
}

function diff (num1, num2) {
    let decreaseValue = num1 - num2;
    return (decreaseValue / num1) * 100;
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function BitrueGetStockPrice(stock) {
    return new Promise(async function (resolve, reject) {
        let url = `https://www.bitrue.com/api/v1/ticker/price?symbol=${stock}`;

        async function request() {
            try {
                const req = await fetch(url);
                const response = await req.json();
                resolve(response.price);
            } catch (err) {
                console.log(err);
            }
        }
        await request();
    });
}

/**
 * resolve a list with every currency pair that exist on the exchange
 *
 * @returns {Promise<JSON>}
 * @constructor
 */
async function BitrueGetAllCurrencys(){
    return new Promise(async function (resolve, reject) {
        let url = `https://www.bitrue.com/api/v1/exchangeInfo`;

        async function request() {
            try {
                const req = await fetch(url);
                const response = await req.json();
                resolve(response.symbols);

            } catch (err) {
                console.log(err);
            }
        }
        await request();
    });
}

async function BitrueGetAllCurrencyPairs(searchSymbol) {
    let allSymbols = await BitrueGetAllCurrencys();

    for (let i = 0; i < allSymbols.length; i++) {
        if (allSymbols[i].baseAsset.toUpperCase() === searchSymbol.toUpperCase() && allSymbols[i].quoteAsset.toUpperCase() !== "USDT" /*|| allSymbols[i].quoteAsset.toUpperCase() === searchSymbol.toUpperCase()*/) {
                    let targetPair = await BitrueGetStockPrice(allSymbols[i].quoteAsset + "USDT");
                    let basePair = await BitrueGetStockPrice(allSymbols[i].baseAsset + allSymbols[i].quoteAsset);

                    let convertedToUsdt = (targetPair / (1 / basePair)).toFixed(5);

                    prices.push(convertedToUsdt);
                    pairs.push(allSymbols[i].baseAsset + "/" + allSymbols[i].quoteAsset)
        }
    }

    prices.push(await BitrueGetStockPrice(searchSymbol + "USDT"));
    pairs.push(searchSymbol + "/usdt");

    //removes the pairs from the list that are on the Blacklist
    for(let i = 0; i < pairs.length; i++){
        for(let j = 0; j < config.currencyBlacklist.length; j++){
            if(pairs[i].split("/")[1].toUpperCase() === config.currencyBlacklist[j]){
                pairs.splice(i,1);
                prices.splice(i,1);
            }
        }
    }

}

async function BitrueOrderBook(currency){
    return new Promise(async function (resolve, reject) {
        let url = `https://www.bitrue.com//api/v1/depth?symbol=${currency}`;

        async function request() {
            try {
                const req = await fetch(url);
                const response = await req.json();
                //console.log(response);
                resolve(response);
            } catch (err) {
                console.log(err);
            }
        }
        await request();
    });
}


bot.onText(/\/messageId/, (msg) => {
    config.Telegram.messageId = msg.chat.id;
    console.log(msg.chat.id)
    bot.sendMessage(msg.chat.id, "Your messageId: " + msg.chat.id);
});
