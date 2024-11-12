// 필수 모듈 불러오기
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

// 서버 및 OpenAI API 초기 설정
const app = express();
const port = 3000;
const openai = new OpenAI();
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
        // aspect 변수에 따라 이미지 생성 방식 분기
        if (aspect === 'POSTER' || aspect === 'CHARACTER_DESIGN' || aspect === 'NATURE' || aspect === 'ABSTRACT_ART') {
            // '포스터', '캐릭터 디자인', '자연 및 풍경', '추상 예술' 유형 이미지 생성 시 useIdeo 함수 호출
            imageUrl = await useIdeo(mood, finalPrompt);
        } else if (aspect === 'LOGO' || aspect === 'BANNER' || aspect === 'THUMBNAIL' || aspect === 'PRODUCT_IMAGE' || aspect === 'ILLUSTRATION' || aspect === 'INFORGRAPHIC'){
            // '로고', '배너', '자연', '썸네일', '제품 이미지', '일러스트레이션', '인포그래픽' 유형 이미지 생성 시 useDall 함수 호출
            imageUrl = await useDall(mood, finalPrompt);
        }
        res.json({ imageUrl }); // 생성된 이미지 URL을 클라이언트로 응답

    } catch (error) {
        console.error('이미지 생성 오류:', error); // 에러 로그 출력
        res.status(500).json({ error: '이미지 생성 실패' }); // 에러 응답
    }
});

// 정적 파일 제공 (public 폴더 내)
app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});