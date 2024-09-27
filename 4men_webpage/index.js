// const OpenAI = require('openai');
// const openai = new OpenAI();
// (async () => {
//   try {
//     const image = await openai.images.generate({ prompt: "A cute baby sea otter" });
//     console.log(image.data[0].url);
//   } catch (error) {
//     console.error('Error generating image:', error);
//   }
// })();


const express = require('express');
const OpenAI = require('openai');
const cors = require('cors'); // CORS 설정을 위해 추가
const path = require('path'); // 이미지 파일 경로 설정을 위해 추가
const fs = require('fs'); // 이미지 파일 저장을 위해 추가
const translate = require('@vitalets/google-translate-api'); //번역을 위해 추가
const app = express();
const port = 3000;
const openai = new OpenAI();

// CORS 설정
app.use(cors({ origin: '*' })); // 모든 출처 허용
app.use(express.json());

// OpenAI API 키 설정
openai.apiKey = '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';


// 이미지 생성 엔드포인트
app.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;
  console.log(prompt);
  try {
    // OpenAI API를 호출하여 이미지 생성
    const response = await openai.images.generate({ 
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024", });
    console.log(response.data[0].url);
    // const response = await openai.images.generate({
    //   prompt: prompt,
    //   n: 1,
    //   size: '1024x1024',
    // });

    // 이미지 URL 추출
    const imageUrl = response.data[0].url;

    // 이미지 파일 저장 (선택 사항)
    // const imageData = await fetch(imageUrl).then(res => res.buffer());
    // const imageName = 'generated_image.png';
    // const imagePath = path.join(__dirname, 'public', imageName); // 'public' 폴더에 저장
    // fs.writeFileSync(imagePath, imageData);

    // 이미지 URL 응답
    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '이미지 생성 실패' });
  }
});

// 정적 파일 서버 설정 (이미지 파일 제공)
app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});