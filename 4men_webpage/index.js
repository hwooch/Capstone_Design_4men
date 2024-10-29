// 개인적으로 gpt기능 쓸려고 만든 코드. 캡스톤 코드 아님.

const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const translate = require('@vitalets/google-translate-api');
const app = express();
const port = 3000;
const openai = new OpenAI();

app.use(cors({ origin: '*' }));
app.use(express.json());

openai.apiKey = "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";

// 이미지 생성 엔드포인트
app.post('/generate-image', async (req, res) => {
    const { prompt, aspect, mood } = req.body;
    console.log('웹페이지로부터 넘겨받은 문장 : ', prompt, '\n\n');

    let model, promEngine;

    model = "gpt-4o-mini";
    promEngine = ``;
    //프롬프트 생성  중요 키워드추출하는 엔지니어링
    try {
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: "You are someone who creates advertising images." },
                {
                    role: "user",
                    content: '(' + prompt + ')' + promEngine,
                },
            ],
        });

        console.log('AI의 대답 : ' + completion.choices[0].message.content);

        let response;
        let finalPrompt = "커피그려줘";

        response = await openai.images.generate({
            model: "dall-e-3",
            prompt: finalPrompt,
            n: 1,
            size: "1024x1024",
        });
        const imageUrl = response.data[0].url;
        res.json({ imageUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '이미지 생성 실패' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});