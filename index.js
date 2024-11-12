require('dotenv').config();

const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const axios = require('axios');


const translate = require('@vitalets/google-translate-api');
const app = express();
const port = 3000;
const openai = new OpenAI();
const IMAGE_PATH = "C:/castoneImage"

//db와 연관되어 페이지를 한번열때마다 생성되는 seq
let image_seq;
let sendimagePath;
let sendNumbers;
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY , "IDEOGRAM_API_KEY:", process.env.IDEOGRAM_API_KEY);


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

openai.apiKey = process.env.OPENAI_API_KEY;

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
<<<<<<< HEAD

=======
>>>>>>> pjh
            response = await fetch("https://api.ideogram.ai/generate", {
                method: "POST",
                headers: {
                    "Api-Key": process.env.IDEOGRAM_API_KEY,
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

        sendimagePath = imageUrl;
        insertImage(imageUrl);


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

    //image_master테이블 입력받고 seq값 받아오기
    const sql = 'INSERT INTO image_master () VALUES ()';
    db.query(sql, (err, results) => {
        if (err) {
        console.error('데이터 삽입 오류:', err);
        return;
        }
        console.log('데이터 삽입 성공! 생성된 ID:', results.insertId);
        image_seq = results.insertId
    });
      //res.json(results); // 쿼리 결과를 JSON으로 응답
    });
  });

  //이미지 생성시 url받아서 db에 입력
const insertImage = (url) => {
    const now = new Date();

    const year = String(now.getFullYear()).slice(-2); // 연도 마지막 두 자리
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const image_name = `${year}${month}${day}${hours}${minutes}${seconds}.jpg`;
    console.log('이미지 이름:', image_name);
    const path = `${IMAGE_PATH}/${image_name}`;
    saveImage(url, path);

    // INSERT 쿼리 실행
    const sql = `INSERT INTO image (IMAGE_PATH, SEQ) VALUES (?, ?)`;
    const values = [path, image_seq];

    db.query(sql, values, (err, results) => {
    if (err) {
        console.error('데이터 삽입 오류:', err);
        return;
    }
    });

}
//이미지 생성시 png로 저장
const saveImage = (image_url, path) => {
    const imageUrl = image_url;
    // 저장 경로와 파일명 설정
    const filePath = path;  //할때마다 다른 파일명. 그리고 db에 insert

    // 이미지 다운로드 및 저장
    axios({
    url: imageUrl,
    method: 'GET',
    responseType: 'stream' // 이미지 스트림으로 응답 받기
    }).then(response => {
    response.data.pipe(fs.createWriteStream(filePath))
        .on('finish', () => {
        console.log('이미지 저장 완료!');
        })
        .on('error', err => {
        console.error('이미지 저장 실패:', err);
        });
    }).catch(err => {
    console.error('다운로드 실패:', err);
    });
}

//전송버튼 클릭 시 db에서 번호 조회해옴
app.post('/api/sendNumbers', (req, res) => {
    const query = 'SELECT * FROM phone_number WHERE BOOK_NAME IN(?,?)';
    const values = req.body;
    console.log(values);
    db.query(query, values, (err, results) => {
      if (err) {
        console.error('쿼리 실패:', err);
        res.status(500).send('DB 조회 실패');
        return;
      }
    sendNumbers = results.map( item => item.PHONE_NUMBER);
    //console.log([sendimagePath, sendNumbers]);
    //res.send([sendimagePath, sendNumbers]);
    });

    //백엔드 서버에 보내기
    fetch('http://localhost:8080/api/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"sendimagePath":sendimagePath, "sendNumbers":sendNumbers}) // 배열을 JSON 문자열로 변환
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
    res.end();
  });



app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});