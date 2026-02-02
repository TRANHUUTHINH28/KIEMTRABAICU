
import { Student, Question, Grade } from '../types';

const formatImageUrl = (url: string): string => {
  if (!url) return '';
  const cleanUrl = url.trim();
  
  // Kiểm tra xem có phải là link Google Drive hay không
  const driveMatch = 
    cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
    cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
    cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  
  if (driveMatch && (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com'))) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return cleanUrl;
};

// Hàm mới để tìm và trích xuất link ảnh đầu tiên trong một đoạn văn bản
const extractAndFormatUrl = (text: string): { cleanText: string, imageUrl?: string } => {
  if (!text) return { cleanText: '' };
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  
  if (match) {
    const firstUrl = match[0];
    const formattedUrl = formatImageUrl(firstUrl);
    // Nếu link sau khi format khác link cũ (là link Drive) hoặc kết thúc bằng đuôi ảnh
    if (formattedUrl !== firstUrl || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(firstUrl)) {
      return {
        cleanText: text.replace(firstUrl, '').replace(/\s+/g, ' ').trim(),
        imageUrl: formattedUrl
      };
    }
  }
  
  return { cleanText: text };
};

export const fetchGradeData = async (gasUrl: string, grade: Grade): Promise<{ students: Student[], questions: Question[] }> => {
  try {
    const response = await fetch(`${gasUrl}?grade=${grade}`);
    if (!response.ok) throw new Error('Không thể kết nối với Apps Script (Lỗi mạng hoặc URL sai).');
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data.students || !data.questions) {
      throw new Error('Dữ liệu trả về không đúng định dạng (Thiếu danh sách HS hoặc câu hỏi).');
    }

    const formattedQuestions = data.questions.map((q: any) => {
      // 1. Xử lý ảnh trong Content (nếu có)
      const { cleanText, imageUrl: extractedImg } = extractAndFormatUrl(q.content || '');
      
      // 2. Ưu tiên ảnh từ cột Image, nếu không có thì lấy ảnh trích xuất từ Content
      let finalImage = q.image ? formatImageUrl(q.image) : extractedImg;

      return {
        ...q,
        content: cleanText,
        image: finalImage,
        // 3. Xử lý ảnh cho từng đáp án (nếu đáp án là link)
        options: q.options.map((opt: string) => formatImageUrl(opt))
      };
    });

    return { 
      students: data.students, 
      questions: formattedQuestions 
    };
  } catch (err: any) {
    throw new Error(err.message || 'Lỗi không xác định khi tải dữ liệu.');
  }
};
