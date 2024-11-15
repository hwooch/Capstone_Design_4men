console.log(12132132132132);
// require('dotenv').config();

// console.log(process.env.IDEOGRAM_API_KEY);

// async function remixImage(imageFile) {
//     const url = 'https://api.ideogram.ai/remix';
//     const form = new FormData();
//     form.append('image_request', JSON.stringify({
//         "prompt": "A serene tropical beach scene. ...", // 여기에 필요한 prompt 내용을 추가
//         "aspect_ratio": "ASPECT_10_16",
//         "image_weight": 50,
//         "magic_prompt_option": "ON",
//         "model": "V_2"
//     }));
//     form.append('image_file', imageFile); // 선택된 이미지 파일 추가

//     const options = {
//         method: 'POST',
//         headers: {
//             'Api-Key': '<apiKey>' // 실제 API 키로 대체
//         },
//         body: form
//     };

//     try {
//         const response = await fetch(url, options);
//         const data = await response.json();
//         return data.imageUrl; // 생성된 이미지 URL 반환
//     } catch (error) {
//         console.error(error);
//         throw new Error('이미지 재생성 중 오류가 발생했습니다.');
//     }
// }

export async function remixImage(imageFile) {
    console.log("asdffadsafsdafsd");
    const url = 'https://api.ideogram.ai/remix';
    const form = new FormData();
    form.append('image_request', JSON.stringify({
        "prompt": "A serene tropical beach scene. ...", // 여기에 필요한 prompt 내용을 추가
        "aspect_ratio": "ASPECT_10_16",
        "image_weight": 50,
        "magic_prompt_option": "ON",
        "model": "V_2"
    }));
    form.append('image_file', imageFile); // 선택된 이미지 파일 추가
    console.log("asdffadsafsdafsd");
    const options = {
        method: 'POST',
        headers: {
            //'Api-Key': process.env.IDEOGRAM_API_KEY // 직접 API 키를 넣으세요
            'Api-Key': "L6gNQBBkoelyM9u_mCQjHQRjAANh4bLB0MLLZobBknnTVHZnniNMQaSWBT44229ewv4__8yBikCUfHFABkwEXQ" // 직접 API 키를 넣으세요
        },
        body: form
    };
    console.log("asdffadsafsdafsd");
    console.log(form);
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data.imageUrl; // 생성된 이미지 URL 반환
    } catch (error) {
        console.error(error);
        throw new Error('이미지 재생성 중 오류가 발생했습니다.');
    }
}