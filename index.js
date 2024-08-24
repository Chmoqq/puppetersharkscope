const puppeteer = require('puppeteer');
const axios = require('axios');
const { google } = require('googleapis');

// Функция для получения нового токена доступа с использованием Refresh Token
async function getAccessToken() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'  // Redirect URI (замените при необходимости)
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const { token } = await oauth2Client.getAccessToken();
    return token;
}

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Переход на страницу авторизации
        await page.goto('https://ru.sharkscope.com/#responsive/Login_ru.html', { waitUntil: 'networkidle0' });

        // Ожидание наличия функции top.Login на странице
        await page.waitForFunction(() => typeof top.Login === 'function', { timeout: 10000 });

        // Вызов функции top.Login с использованием page.evaluate
        await page.evaluate((email, password) => {
            if (top.Login) {
                top.Login(email, password);
            } else {
                throw new Error("Login function not found");
            }
        }, 'evolutsiya.poker@gmail.com', '4Kc_FwGakAVVpPU');

        // Ожидание навигации после логина
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // Переход на страницу с нужными данными
        await page.goto('https://ru.sharkscope.com/#Player-Statistics/Advanced-Search//networks/Player%20Group/players/N.Amelin%24?filter=Date:1722459600~1724533199', { waitUntil: 'networkidle0' });

        // Ожидание загрузки динамического контента
        await page.waitForSelector('td[role="gridcell"] .ui-jqgrid-cell-wrapper');

        // Извлечение данных
        const data = await page.evaluate(() => {
            const extractText = (ariaDescribedBy) => {
                const element = document.querySelector(`td[role="gridcell"][aria-describedby="${ariaDescribedBy}"] .ui-jqgrid-cell-wrapper`);
                return element ? element.innerText.trim() : null;
            };

            return {
                totalROI: extractText('mainplayergrid_TotalROI'),
                count: extractText('mainplayergrid_Count'),
                avStake: extractText('mainplayergrid_AvStake'),
                finishesEarly: extractText('mainplayergrid_FinshesEarly')
            };
        });

        console.log('Извлеченные данные:', data);

        // Получение нового токена доступа
        const accessToken = await getAccessToken();

        // Отправка данных в Google Sheets
        try {
            const url = 'https://sheets.googleapis.com/v4/spreadsheets/1B2wJqAf3hmkw4YH-M_PqLZnOKP-qQmAt0S5x3W1B_qw/values/Main!C3:F3:append?valueInputOption=RAW';
            const body = {
                range: 'Main!C3:F3',
                majorDimension: 'ROWS',
                values: [
                    [data.totalROI, data.count, data.avStake, data.finishesEarly]
                ]
            };

            const response = await axios.post(url, body, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Данные успешно отправлены в Google Sheets:', response.data);
        } catch (error) {
            console.error('Ошибка при отправке данных в Google Sheets:', error.response ? error.response.data : error.message);
        }
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        // Закрытие браузера
        await browser.close();
    }
}

// Запуск скрипта
run().catch(console.error);
