const puppeteer = require('puppeteer');
const axios = require('axios');

async function run() {
    const browser = await puppeteer.launch({ headless: true }); // Установите headless: true для режима без головы
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
        await page.goto('https://ru.sharkscope.com/#Player-Statistics/Advanced-Search//networks/Player%20Group/players/ChmoqqWV?filter=Date:1722459600~1724446799', { waitUntil: 'networkidle0' });

        // Ожидание загрузки динамического контента
        await page.waitForSelector('td[role="gridcell"] .ui-jqgrid-cell-wrapper');

        // Извлечение данных
        const data = await page.evaluate(() => {
            // Функция для извлечения текста из ячеек
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

        // Отправка данных в Google Sheets
        try {
            await axios.post('https://sheets.googleapis.com/v4/spreadsheets/1B2wJqAf3hmkw4YH-M_PqLZnOKP-qQmAt0S5x3W1B_qw/values/TestList!A1:D1:append', {
                range: 'TestList!A1:D1',
                majorDimension: 'ROWS',
                values: [
                    [data.totalROI, data.count, data.avStake, data.finishesEarly]
                ]
            }, {
                headers: {
                    'Authorization': `Bearer AIzaSyCNVhCEkSRemTnUgAuPhcAj9HH1oiliDOU`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Ошибка при отправке данных в Google Sheets:', error.message);
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
