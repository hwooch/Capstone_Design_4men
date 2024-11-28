require('dotenv').config();

const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const axios = require('axios');
const fetch = require("node-fetch");
const sharp = require('sharp');

// multer 설정git add index.js public/index.html
const multer = require('multer'); // multer 추가
const storage = multer.memoryStorage(); // 메모리에 파일 저장
const upload = multer({ storage: storage });

const translate = require('@vitalets/google-translate-api');
const app = express();
const port = 3000;
const openai = new OpenAI();
const IMAGE_PATH = "/home/ec2-user/castoneImage"   //서버에서의 path

//db와 연관되어 페이지를 한번열때마다 생성되는 seq
let image_seq;
let sendimagePath;
let sendNumbers;

//객체 생성
const db = mysql.createConnection({
    host: 'localhost',
    user: 'fourman',
    password: 'fourMan1234!',
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

// 전달받은 텍스트를 요약하여 프롬프트 추출
async function summarizeText(text) {
    try {
        // 위 텍스트에서 날짜, 일시, 전화번호를 제거해줘. 그리고 두 문장 이내로 요약해줘.
        const summaryPrompt = `
        "${text}"
        위 텍스트에서 날짜, 일시, 전화번호를 제거해줘. 그리고 무엇을 전달하고자 하는지 3단어 이내로 요약해줘.
        단어만 말해. 예를들어 "자전거","오토바이" 이런식으로
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // 모델 이름 확인 필요
            messages: [
                { role: "system", content: "You are a helpful assistant for summarizing text." },
                { role: "user", content: summaryPrompt }
            ]
        });

        const summary = response.choices[0]?.message?.content?.trim();
        if (!summary) {
            throw new Error("요약 생성 실패");
        }
        return summary;
    } catch (error) {
        console.error("텍스트 요약 오류:", error);
        throw error;
    }
}


//console.log(process.env.OPENAI_API_KEY + "\n\n" + process.env.IDEOGRAM_API_KEY);
// Ideogram API 호출 함수
async function generateIdeogramImage(prompt, keyword_input, aspect, mood) {
    //console.log(prompt, keyword_input, aspect, mood);
    let finalPrompt;
    if (keyword_input == "") {
        finalPrompt = `(${prompt}) 괄호에 포함된 문장을 ${aspect} 형식으로 텍스트가 절대로 포함되지 않게 해줘. never include text`;
        console.log("AI에게 넘겨지는 최종 문장\n" + finalPrompt);
    } else {
        finalPrompt = `(${prompt} ), 텍스트는 절대 포함하지 말고 \"${keyword_input}\" 만 꼭 넣어서 ${aspect} 형식으로 그려줘`;
        //finalPrompt = `불꽃놀이를 표현하는 이미지를 그릴건데, \"${keyword_input}\" 를 꼭 넣어서 ${aspect} 형식으로 그려줘`;
        console.log("AI에게 넘겨지는 최종 문장\n" + finalPrompt);
    }

    //const finalPrompt = `${prompt}를 표현하는 그림을 그릴건데 \"${text}" 글자를 그림에 포함시켜줘. ${aspect} 형식으로 그려줘`;

    try {
        const response = await fetch("https://api.ideogram.ai/generate", {
            method: "POST",
            headers: {
                "Api-Key": process.env.IDEOGRAM_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "image_request": {
                    "prompt": finalPrompt,
                    "model": "V_2_TURBO",
                    "negative_prompt": "text, logo, watermark",
                    "style_type": mood, // AUTO, DESIGN, GENERAL, REALISTIC, RENDER_3D에 맞춰 적용
                    "negative_prompt": "text, number"
                }
            }),
        });
        const body = await response.json();
        console.log(body);
        return body.data[0]?.url; // 이미지 URL 반환
    } catch (error) {
        console.error("Ideogram API 호출 오류:", error);
        throw new Error('Ideogram 이미지 생성 실패');
    }
}

//DALL-E 사용 함수
async function generateDalleImage(prompt, aspect, mood) {
    console.log("달이 시작");
    try {
        let finalPrompt;
        if (aspect == "기본 관점") {
            aspect = "너가 원하는";
        }
        if (mood == "기본 분위기") {
            mood = "너가 원하는";
        }
        finalPrompt = `${prompt}. 해당 문장을 ${aspect} 형식과 ${mood} 느낌으로 이미지를 생성하는데 텍스트가 절대 들어가지 않게 해줘. never include text`;
        console.log("\nAI에게 넘겨지는 최종 문장\n" + finalPrompt);
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
        console.log("달이 끝");
        return imageUrl;
    } catch (error) {
        console.error("DALL-E 이미지 생성 오류:", error);
        throw error;
    }

}

//이미지 생성 함수 실행
app.post('/generate-image', async (req, res) => {
    const { prompt, keyword_input, aspect } = req.body;
    let mood = req.body.mood;
    console.log('웹페이지로부터 받은 데이터:', prompt, '\n생성 유형:', aspect, mood);

    try {
        // 요약된 텍스트 생성
        const summarizedPrompt = await summarizeText(prompt);
        console.log('요약된 프롬프트:', summarizedPrompt);

        let temp = keyword_input.trim();
        let flag = temp !== "";

        let imageUrl;
        // 기존 로직 유지
        if (["Cartoon", "Watercolor Painting"].includes(aspect)) {
            if (!flag) {
                console.log("dall-e로 생성\n\n");
                imageUrl = await generateDalleImage(summarizedPrompt, aspect, mood);
            } else {
                // mood 값 검증 및 기본값 설정
                if (!["AUTO", "GENERAL", "REALISTIC", "DESIGN", "RENDER_3D"].includes(mood)) {
                    console.log("유효하지 않은 mood 값입니다. 기본값 AUTO로 설정.");
                    mood = "AUTO";
                }
                console.log("ideo로 생성\n\n");
                imageUrl = await generateIdeogramImage(summarizedPrompt, temp, aspect, mood);
            }
        } else if (["Advertisement", "제품 렌더링", "Illustration", "Poster"].includes(aspect)) {
            // mood 값 검증 및 기본값 설정
            if (!["AUTO", "GENERAL", "REALISTIC", "DESIGN", "RENDER_3D"].includes(mood)) {
                console.log("유효하지 않은 mood 값입니다. 기본값 AUTO로 설정.");
                mood = "AUTO";
            }
            console.log("ideo로 생성\n\n");
            imageUrl = await generateIdeogramImage(summarizedPrompt, temp, aspect, mood);
        } else {
            if (!flag) {
                console.log("dall-e로 생성\n\n");
                imageUrl = await generateDalleImage(summarizedPrompt, aspect, mood);
            } else {
                // mood 값 검증 및 기본값 설정
                if (!["AUTO", "GENERAL", "REALISTIC", "DESIGN", "RENDER_3D"].includes(mood)) {
                    console.log("유효하지 않은 mood 값입니다. 기본값 AUTO로 설정.");
                    mood = "AUTO";
                }
                console.log("ideo로 생성\n\n");
                imageUrl = await generateIdeogramImage(summarizedPrompt, temp, aspect, mood);
            }
        }

        res.json({ imageUrl });
        sendimagePath = imageUrl;
        insertImage(imageUrl);

    } catch (error) {
        console.error("이미지 생성 중 오류:", error);
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
        // console.log(phone_book);
        // res.send(phone_book);

        const query2 = 'SELECT MESSAGE FROM message_history';
        db.query(query2, (err, results) => { //문자 전송내역
            if (err) {
                console.error('쿼리 실패:', err);
                res.status(500).send('DB 조회 실패');
                return;
            }
            const message_history = results.map(item => item.MESSAGE);
            console.log(message_history);
            const result = { phone_book, message_history };
            res.send(result);
        });

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

// 이미지 생성시 png로 저장
const saveImage = async (image_url, filePath) => {
    const imageUrl = image_url;
    const originalPath = filePath; // 원본 이미지 경로
    const tempPath1 = `${originalPath}.temp1`; // 임시 파일 1
    const tempPath2 = `${originalPath}.temp2`; // 임시 파일 2

    const maxFileSize = 299 * 1024; // 최대 파일 크기 (300KB)
    let quality = 100; // 초기 품질 설정
    let currentTempPath = tempPath1;
    let nextTempPath = tempPath2;

    try {
        // 원본 이미지 다운로드 및 저장
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream' // 이미지 스트림으로 응답 받기
        });

        // 원본 이미지 저장
        await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(originalPath);
            response.data.pipe(writeStream)
                .on('finish', () => {
                    console.log('원본 이미지 저장 완료!');
                    resolve();
                })
                .on('error', err => {
                    console.error('원본 이미지 저장 실패:', err);
                    reject(err);
                });
        });

        // 첫 번째 임시 파일에 초기 이미지 저장
        await sharp(originalPath)
            .resize(800) // 지금 사진이 1024x1024로 생성되는데
            // resize안에 800 넣으면 800x800으로 생성됨
            .png({ quality })
            .withMetadata(false) // 메타데이터 제거
            .toFile(currentTempPath);

        // 파일 크기를 확인하고 품질 조정
        let stats = fs.statSync(currentTempPath);
        while (stats.size > maxFileSize && quality > 1) {
            quality -= 1; // 품질을 1씩 낮춤

            // 다음 임시 파일에 저장
            await sharp(currentTempPath)
                .png({ quality })
                .withMetadata(false) // 메타데이터 제거
                .toFile(nextTempPath);

            // 파일 크기 재확인
            stats = fs.statSync(nextTempPath);

            // 이전 임시 파일 삭제
            fs.unlinkSync(currentTempPath);

            // 임시 파일 경로 교환
            [currentTempPath, nextTempPath] = [nextTempPath, currentTempPath];
        }

        // 최종 압축된 파일 경로 설정 (예: example_copy.png)
        const compressedPath = path.join(
            path.dirname(originalPath),
            `${path.basename(originalPath, path.extname(originalPath))}_copy${path.extname(originalPath)}`
        );

        // 최종 압축된 파일 저장
        fs.renameSync(currentTempPath, originalPath); // 임시 파일을 압축된 이미지로 이동
        console.log('압축된 이미지 저장 완료!', stats.size / 1024, 'KB');

    } catch (err) {
        console.error('다운로드 또는 저장 실패:', err);
    } finally {
        // 임시 파일 삭제 (존재하는 경우)
        [tempPath1, tempPath2].forEach(tempFile => {
            if (tempFile && fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        });
        await sharp(originalPath)
            .jpeg({ quality: 80, progressive: true }) // PNG를 JPEG로 변환
            .toFile(`${originalPath}1`);

        fs.renameSync(`${originalPath}1`, originalPath); // 임시 파일을 원본 경로로 이동
    }
}

//전송버튼 클릭 시 db에서 번호 조회해옴
app.post('/api/sendNumbers', async (req, res) => {
    const values = req.body;
    let messageContent = values.prompt;
    if (messageContent.includes('\n')) {
        messageContent = messageContent.replace(/\n/g, '\\n');
    }
    console.log('넘어온 데이터:', values);
    let bookNumbers = [];

    try {

        const insertQuery = 'INSERT INTO message_history (MESSAGE) VALUES (?)'
        db.query(insertQuery, messageContent, (err, results) => {
            if (err) {
                console.error('데이터 삽입 오류:', err);
                return;
            }
        });
        // 첫 번째 쿼리 실행
        if (values.phoneBook.length > 0) {
            bookNumbers = await new Promise((resolve, reject) => {
                const placeholders = values.phoneBook.map(() => '?').join(',');
                const query = `SELECT PHONE_NUMBER FROM phone_number WHERE BOOK_NAME IN (${placeholders})`;
                db.query(query, values.phoneBook, (err, results) => {
                    if (err) return reject(err);
                    resolve(results.map(item => item.PHONE_NUMBER));
                });
            });
        }

        console.log('조회된 번호:', bookNumbers);
        console.log('직접입력:', values.phoneNumbers);
        sendNumbers = [...bookNumbers, ...values.phoneNumbers];
        console.log('주소록 + 직접입력 : ', sendNumbers);

        // 두 번째 쿼리 실행
        const sendimagePath = await new Promise((resolve, reject) => {
            const query2 = `SELECT IMAGE_PATH FROM image WHERE IMAGE_URL = ?`;
            db.query(query2, values.imageSrc, (err, results) => {
                if (err) return reject(err);
                resolve(results[0]?.IMAGE_PATH || null);
            });
        });

        console.log("조회된 이미지 경로:", sendimagePath);

        // fetch 호출
        const response = await fetch('http://3.27.171.67:8080/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sendimagePath,
                sendNumbers,
                messageContent: values.prompt
            })
        });

        const responseData = await response.json();
        console.log('백엔드 서버 응답:', responseData);

        // 클라이언트에 성공 응답 전송
        res.send(responseData);
    } catch (error) {
        console.error('에러 발생:', error);
        res.status(500).send('처리 중 오류가 발생했습니다.');
    }
});

// 이미지 리스트를 가져오는 API
app.get('/api/images', async (req, res) => {
    db.query('SELECT IMAGE_URL FROM image WHERE SEQ = ? ORDER BY IMAGE_PATH DESC', [image_seq], (error, results) => {
        if (error) throw error;
        console.log(results);
        const urlArray = results.map(row => row.IMAGE_URL);
        res.json(urlArray); // 이미지 경로 리스트 반환
    });
});

app.use(express.static(path.join(__dirname, 'public')));


app.get('/api/phonebook/:name', (req, res) => {
    const bookName = req.params.name; // URL 파라미터에서 주소록 이름 가져오기
    const query = 'SELECT PHONE_NUMBER FROM phone_number WHERE BOOK_NAME = ?'; // 쿼리에서 파라미터 사용

    db.query(query, [bookName], (err, results) => {
        if (err) {
            console.error('쿼리 실패:', err);
            res.status(500).send('DB 조회 실패');
            return;
        }
        const phone_numbers = results.map(item => item.PHONE_NUMBER);
        res.json(phone_numbers); // 전화번호 배열을 JSON 형식으로 응답
    });
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});