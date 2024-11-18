require('dotenv').config();

const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const axios = require('axios');
const fetch = require("node-fetch");

// multer 설정git add index.js public/index.html
const multer = require('multer'); // multer 추가
const storage = multer.memoryStorage(); // 메모리에 파일 저장
const upload = multer({ storage: storage });

const translate = require('@vitalets/google-translate-api');
const app = express();
const port = 3000;
const openai = new OpenAI();
const IMAGE_PATH = "C:/castoneImage"

//db와 연관되어 페이지를 한번열때마다 생성되는 seq
let image_seq;                               
let sendimagePath;
let sendNumbers;

console.log(process.env.OPENAI_API_KEY, process.env.IDEOGRAM_API_KEY);
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
        //console.error('DB 연결 실패:', err);
        return;
    }
    console.log('MySQL 연결 성공!');
});

app.use(cors({ origin: '*' }));
app.use(express.json());


// 이미지 재생성 API
app.post('/remix-image', upload.single('imageFile'), async (req, res) => {
    const imageFile = req.file; // multer가 처리한 파일
    
    console.log("파일 정보:", imageFile); // 파일 정보 확인
    console.log("Body Data:", req.body); // Check what is received in the body
    if (!imageFile) {
        return res.status(400).json({ error: '파일이 전송되지 않았습니다.' });
    }

    const imageRequest = JSON.parse(req.body.image_request); // JSON 요청 데이터
    const test = req.body; // JSON 요청 데이터
    console.log("test Data:", test); 
    console.log("요청 데이터:", imageRequest); // 요청 데이터 확인


    const asdf = new FormData();
    const IMAGE_PATH = "Capstone_Design_4men/public/hwooch.png";
    const imagePath = path.join(IMAGE_PATH);
    asdf.append("image_file", imagePath);
    asdf.append("image_request", JSON.stringify({
        "prompt": "Change the color of the flower to blue",
        "aspect_ratio": "ASPECT_10_16",
        "image_weight": 50,
        "magic_prompt_option": "ON",
        "model": "V_2"
      }));

    console.log(asdf);

    let response;
    try {
        response = await fetch("https://api.ideogram.ai/remix", {
            method: "POST",
            headers: {
                "Api-Key": process.env.IDEOGRAM_API_KEY,
            },
            body: asdf,
        });

        body = await response.json();
        console.log("API 응답:", body); // API 응답 확인

        // API 요청 후 결과를 클라이언트에 반환
        res.json({ imageUrl: "https://ideogram.ai/api/images/ephemeral/kkBJzIhhQuO3Mt85DucwDA.png?exp=1731510508&sig=444c17af04139db3c242a4523e6f8badf4fe25d849f1ce754a19a8f62ca96089" }); // 실제 이미지 URL로 대체
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 오류' });
    }
});


openai.apiKey = "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";
const ideogramApiKey = "L6gNQBBkoelyM9u_mCQjHQRjAANh4bLB0MLLZobBknnTVHZnniNMQaSWBT44229ewv4__8yBikCUfHFABkwEXQ"; 
//console.log(process.env.OPENAI_API_KEY + "\n\n" + process.env.IDEOGRAM_API_KEY);
// Ideogram API 호출 함수
async function generateIdeogramImage(prompt, mood, aspect) {
    const finalPrompt = `${prompt}. 텍스트를 포함하지 않고 ${aspect} 형식으로 그려서`;
    
    try {
        const response = await fetch("https://api.ideogram.ai/generate", {
            method: "POST",
            headers: {
                "Api-Key": ideogramApiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "image_request": {
                    "prompt": finalPrompt,
                    "model": "V_2_TURBO",
                    "negative_prompt": "text, logo, watermark",
                    "style_type": mood // ANIME, AUTO, DESIGN, GENERAL, REALISTIC, RENDER_3D에 맞춰 적용
                }
            }),
        });
        const body = await response.json();
        return body.data[0]?.url; // 이미지 URL 반환
    } catch (error) {
        console.error("Ideogram API 호출 오류:", error);
        throw new Error('Ideogram 이미지 생성 실패');
    }
}

//DALL-E 사용 함수
async function generateDalleImage(prompt, aspect, mood) {
    try {
        const finalPrompt = `${prompt}. 텍스트를 포함하지 않고 ${aspect} 형식으로 그려서 ${mood} 느낌으로 그려줘`;
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: finalPrompt,
            n: 1,
            size: "1024x1024",
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
            throw new Error('이미지 생성 실패');
        }

        return imageUrl;
    } catch (error) {
        console.error("DALL-E 이미지 생성 오류:", error);
        throw error;
    }
}

//이미지 생성 함수 실행
app.post('/generate-image', async (req, res) => {
    const { prompt, aspect, mood } = req.body;
    console.log('웹페이지로부터 받은 데이터:', prompt, '\n생성 유형:', aspect, mood);

    let imageUrl;
    try {
        // DALL-E가 처리할 작업
        if (["포스터", "컨셉 아트", "일러스트", "커버 아트"].includes(aspect)) {
            imageUrl = await generateDalleImage(prompt, aspect, mood);
        } 
        // Ideogram이 처리할 작업
        else if (["광고", "제품 렌더링", "정보 그래픽"].includes(aspect)) {
            imageUrl = await generateIdeogramImage(prompt, mood);
        } 
        // 직접 입력
        else imageUrl = await generateDalleImage(prompt, aspect, mood);

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
        const phone_book = results.map(item => item.book_name);
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
    const sql = `INSERT INTO image (IMAGE_PATH, SEQ, IMAGE_URL) VALUES (?, ?, ?)`;
    const values = [path, image_seq, url];

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
    const values = req.body;
    console.log(values);
    db.query(query, values, (err, results) => {
        if (err) {
            console.error('쿼리 실패:', err);
            res.status(500).send('DB 조회 실패');
            return;
        }
        sendNumbers = results.map(item => item.PHONE_NUMBER);
        //console.log([sendimagePath, sendNumbers]);
        //res.send([sendimagePath, sendNumbers]);
    });

    //백엔드 서버에 보내기
    fetch('http://localhost:8080/api/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "sendimagePath": sendimagePath, "sendNumbers": sendNumbers }) // 배열을 JSON 문자열로 변환
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

// 이미지 리스트를 가져오는 API
app.get('/api/images', async (req, res) => {
    db.query('SELECT IMAGE_URL FROM image WHERE SEQ = ?', [image_seq], (error, results) => {
        if (error) throw error;
        console.log(results);
        const urlArray = results.map(row => row.IMAGE_URL);
        res.json(urlArray); // 이미지 경로 리스트 반환
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});