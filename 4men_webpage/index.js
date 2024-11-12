// 필수 모듈 불러오기
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const axios = require('axios');
const fetch = require('node-fetch');

// 서버 및 OpenAI API 초기 설정
const app = express();
const port = 3000;
const openai = new OpenAI();
const IMAGE_PATH = "C:/castoneImage"

//db와 연관되어 페이지를 한번열때마다 생성되는 seq
let image_seq;
let sendimagePath;
let sendNumbers;

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

// 미들웨어 설정
app.use(cors({ origin: '*' })); // 모든 출처 허용 (테스트용)
app.use(express.json()); // JSON 요청 본문을 파싱


// 형태별 프롬프트 상수 설정
const STYLES = {
    LOGO: "modern and minimalist logo design, simple lines and monochrome colors",
    BANNER: "dynamic and vibrant banner design, high contrast, professional layout",
    THUMBNAIL: "eye-catching thumbnail for a YouTube video, bold and colorful",
    PRODUCT_IMAGE: "3D rendered product image, high-quality, realistic lighting",
    ILLUSTRATION: "hand-drawn style, whimsical, colorful illustration of a cityscape",
    INFOGRAPHIC: "clean and organized infographic layout, pastel colors, icons and charts"
};

// 한글을 영어로 번역하는 함수
async function translateToEnglish(text) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: `Please translate the following text to English: ${text}` }
            ]
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('번역 중 오류 발생:', error);
        throw new Error('번역 실패');
    }
}

// Ideogram을 통한 이미지 생성 함수
async function useIdeo(mood, finalPrompt) {
    console.log("이데오 사용 번역 전 프롬프트: " + finalPrompt);
    try {
        finalPrompt = await translateToEnglish(finalPrompt); // 한국어 프롬프트를 영어로 번역
        console.log("이데오 사용 번역 후 프롬프트: " + finalPrompt);
        
        const response = await fetch("https://api.ideogram.ai/generate", {
            method: "POST",
            headers: {
                "Api-Key": "L6gNQBBkoelyM9u_mCQjHQRjAANh4bLB0MLLZobBknnTVHZnniNMQaSWBT44229ewv4__8yBikCUfHFABkwEXQ",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "image_request": {
                    "prompt": finalPrompt,
                    "model": "V_2_TURBO",
                    "negative_prompt": "text, logo, watermark", // 생성 이미지에서 텍스트, 로고, 워터마크 제외
                    "style_type": mood // style_type을 파라미터로 전달
                }
            }),
        });

        const body = await response.json();
        const imageUrl = body.data[0].url;
        console.log(`사용된 모델: V_2_TURBO (Ideogram), 스타일: ${mood}`);
        return imageUrl;

    } catch (error) {
        console.error('이미지 생성 중 오류 발생:', error);
        throw new Error('이미지 생성 실패');
    }
}

// DALL_E를 통한 이미지 생성 함수
async function useDall(mood, finalPrompt) {
    console.log("달이 사용 번역 전 최종 프롬프트: " + finalPrompt);
    try {
        finalPrompt = finalPrompt + " 그림풍은 " + mood; // mood 추가
        finalPrompt = await translateToEnglish(finalPrompt); // 한국어 프롬프트를 영어로 번역
        console.log("달이 사용 번역 후 프롬프트: " + finalPrompt);

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: finalPrompt,
            n: 1,
            size: "1024x1024",
        });
        const imageUrl = response.data[0].url;
        return imageUrl;
    } catch (error) {
        console.error('DALL-E 이미지 생성 중 오류 발생:', error);
        throw new Error('DALL-E 이미지 생성 실패');
    }
}


// 이미지 생성 엔드포인트
app.post('/generate-image', async (req, res) => {
    // 클라이언트 요청에서 prompt, aspect, mood 변수 추출
    const { prompt, aspect, mood } = req.body;
    console.log('웹페이지로부터 넘겨받은 문장:', prompt, '\n생성 유형:', aspect, '\n분위기:', mood);

    // 사용자 입력 텍스트에 광고용 프롬프트 추가
    const styleDescription = STYLES[aspect] || ""; // aspect에 따라 스타일 설명 가져오기
    const finalPrompt = `${prompt} 이 내용을 광고하는 이미지를 ${aspect} 형태로 생성해줘. 이미지에는 텍스트가 전혀 없어야 해. ${styleDescription}`;
    let imageUrl;

    try {
<<<<<<< HEAD
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

=======
        // aspect 변수에 따라 이미지 생성 방식 분기
        if (aspect === 'POSTER' || aspect === 'CHARACTER_DESIGN' || aspect === 'NATURE' || aspect === 'ABSTRACT_ART') {
            // '포스터', '캐릭터 디자인', '자연 및 풍경', '추상 예술' 유형 이미지 생성 시 useIdeo 함수 호출
            imageUrl = await useIdeo(mood, finalPrompt);
        } else if (aspect === 'LOGO' || aspect === 'BANNER' || aspect === 'THUMBNAIL' || aspect === 'PRODUCT_IMAGE' || aspect === 'ILLUSTRATION' || aspect === 'INFORGRAPHIC'){
            // '로고', '배너', '자연', '썸네일', '제품 이미지', '일러스트레이션', '인포그래픽' 유형 이미지 생성 시 useDall 함수 호출
            imageUrl = await useDall(mood, finalPrompt);
        }
        res.json({ imageUrl }); // 생성된 이미지 URL을 클라이언트로 응답
>>>>>>> f13077c131d31139418d6b4a21ac3674436ed4a8

    } catch (error) {
        console.error('이미지 생성 오류:', error); // 에러 로그 출력
        res.status(500).json({ error: '이미지 생성 실패' }); // 에러 응답
    }
});

<<<<<<< HEAD
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



=======
// 정적 파일 제공 (public 폴더 내)
>>>>>>> f13077c131d31139418d6b4a21ac3674436ed4a8
app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});