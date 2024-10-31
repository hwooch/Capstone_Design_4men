const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');

const translate = require('@vitalets/google-translate-api');
const app = express();
const port = 3000;
const openai = new OpenAI();

//객체 생성
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'precapstonedb'
  });
// db연결
db.connect(err => {
if (err) {
    console.error('DB 연결 실패:', err);
    return;
}
console.log('MySQL 연결 성공!');
});

app.use(cors({ origin: '*' }));
app.use(express.json());

openai.apiKey = "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";

// 이미지 생성 엔드포인트
app.post('/generate-image', async (req, res) => {
    const { prompt, aspect, mood } = req.body;
    console.log('웹페이지로부터 넘겨받은 문장 : ', prompt, '\n넘겨받은 생성 유형 : ', aspect, mood);

    let model, promEngine;
    let moodValue = mood;

    if (moodValue == '기본 분위기') {
        moodValue = "";
    }

    //let promEngine = "question : 지금 바로 제주도로 떠나보세요! 숙박 최대 30% 할인 혜택 🎉한정된 기간 동안만 제공되는 특별 프로모션! 힐링 가득한 제주에서 아름다운 추억을 만들어보세요.🔹 혜택: 숙박 30% 할인🔹 기간: 00월 00일 ~ 00월 00일🔹 예약 바로가기: [링크] 지금 예약하고 제주도에서 힐링하세요! ✈️, answer : 제주도 랜드마크 이미지를 바탕으로 30% 할인을 강조하는 광고 이미지를 그리는데 (30% SALE) 을 제외한 나머지 모든 문자와 숫자를 제외하고 그려줘, question : 지금 바로 브라질로 떠나세요! 항공권 50% 할인 혜택 🎉 한정 기간 동안만 가능한 특별 할인 이벤트! 다채로운 문화와 자연의 경이로움을 경험해보세요. 🔹 혜택: 항공권 50% 할인 🔹 기간: 00월 00일 ~ 00월 00일 🔹 예약 바로가기: [링크] 지금 예약하고 환상적인 브라질을 만나보세요! 🌍, answer : 브라질 랜드마크 이미지를 바탕으로 50% 할인을 강조하는 광고 이미지를 그리는데 (50% SALE) 을 제외한 나머지 모든 문자와 숫자를 제외하고 그려줘. question :"
    //let promEngine = "중요 키워드를 3개 정도 뽑아서 한 문장으로 짧게 요약해줘. 그리고 그 중에서 포스터에 들어갈 강조될 문장은 뭐인것같아?"


    // if (aspect === '자연') { // 선택에 따라 모델 다르게 선택
    //     model = "gpt-4o-mini";
    // } else if (aspect === '포스터') {
    //     model = "gpt-4o-mini";
    // } else {
    //     model = "gpt-4o-mini";
    // }

    model = "gpt-4o-mini";
    promEngine = `이 광고 문자의 주제를 두개 단어 혹은 세개 단어 정도로 요약해봐`;

    //프롬프트 생성, 중요 키워드추출하는 엔지니어링
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

        let generatedPrompt = `${completion.choices[0].message.content}을(를) 표현하는 그림을 그릴거야.`;
        // 이미지에 텍스트 필수로 넣고싶다고 선택되었다면 밑에 기능 완성할것
        // let selectText;
        // if (selectText == false){
        //     generatedPrompt = generatedPrompt + '다만, 그림에서 글자는 절대 포함하지 않고 그려줘';
        // }

        generatedPrompt = generatedPrompt + ' 다만, 그림에서 글자는 절대 포함하지 않고 그려줘. ';

        let response;
        let finalPrompt;
        let body;

        // OpenAI API를 호출하여 이미지 생성
        if (aspect === '자연') {
            finalPrompt = `${generatedPrompt}` + ' 그리고 자연을 중점으로 그릴거고' + moodValue + ' 느낌으로 그려줘'; // 1 대신 "자연 형식으로 바꿔줘" 삽입
            response = await openai.images.generate({
                model: "dall-e-3",
                prompt: finalPrompt,
                n: 1,
                size: "1024x1024",
            });
        } else if (aspect === '포스터') {
            // Ideogram API를 호출하여 이미지 생성
            finalPrompt = `${generatedPrompt}` + '포스터 형식으로 그릴거고 '+moodValue+' 느낌으로 그려줘';
            console.log(11111);

            response = await fetch("https://api.ideogram.ai/generate", {
                method: "POST",
                headers: {
                    "Api-Key": "L6gNQBBkoelyM9u_mCQjHQRjAANh4bLB0MLLZobBknnTVHZnniNMQaSWBT44229ewv4__8yBikCUfHFABkwEXQ",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "image_request": {
                        "prompt": finalPrompt,
                        "model": "V_2_TURBO", // V_1 , V_1_TURBO , V_2 , V_2_TURBO ( 총 4개 있음
                        "negative_prompt": "text, logo, watermark",
                        "style_type": "AUTO" //ANIME , AUTO , DESIGN , GENERAL , REALISTIC , RENDER_3D ( 총 6개있음
                    }
                }),
            });
            console.log(2222);
            body = await response.json();
            console.log(body.data[0].url);
            
        } else { // 기본
            finalPrompt = `${generatedPrompt}` + ' 그리고 ' + moodValue + ' 느낌으로 그려줘'; // 3 대신 aspect + " 형식으로 바꿔줘" 삽입
            response = await openai.images.generate({
                model: "dall-e-3", // ""
                prompt: finalPrompt,
                n: 1,
                size: "1024x1024",
            });
        }
        console.log('넘겨지는 최종 문장 :', finalPrompt);

        //const imageUrl = response.data[0].url; // DALL-E 일때 활성화
        const imageUrl = body.data[0].url; // Ideogram 일때 활성화

        res.json({ imageUrl });
        


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '이미지 생성 실패' });
    }
});

// 주소록 목록을 조회하는 API 엔드포인트
app.get('/api/phonebook', (req, res) => {
    const query = 'SELECT * FROM phone_book';
    db.query(query, (err, results) => {
      if (err) {
        console.error('쿼리 실패:', err);
        res.status(500).send('DB 조회 실패');
        return;
      }
      const phone_book = results.map( item => item.book_name);
      console.log(phone_book);
      res.send(phone_book);
      //res.json(results); // 쿼리 결과를 JSON으로 응답
    });
  });



app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});