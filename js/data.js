/**
 * ==============================================================================
 * js/data.js - Dữ liệu hình ảnh trưng bày cho khu vực Showcase trên Landing Page
 * ==============================================================================
 * Dữ liệu được chia thành 3 mảng tương ứng với 3 cột trên giao diện Desktop:
 * - dataCol1: Cột 1
 * - dataCol2: Cột 2
 * - dataCol3: Cột 3
 * 
 * Mỗi phần tử chứa:
 * - id: Định danh duy nhất
 * - title: Tên mô tả ảnh
 * - img: Đường dẫn tương đối đến file ảnh .webp
 * - type: Loại nội dung ('image' hoặc 'video')
 * - backgroundColor: Màu nền dự phòng khi ảnh đang load
 */

// Cột 1: Gồm 7 ảnh
const dataCol1 = [
    {
        id: 'p1_1',
        title: 'anh1',
        img: './images/data/1.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p1_2',
        title: 'anh2',
        img: './images/data/2.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p1_3',
        title: 'anh3',
        img: './images/data/3.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p1_4',
        title: 'anh4',
        img: './images/data/4.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p1_5',
        title: 'anh5',
        img: './images/data/5.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p1_6',
        title: 'anh6',
        img: './images/data/6.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p1_7',
        title: 'anh7',
        img: './images/data/7.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
];

// Cột 2: Gồm 4 ảnh
const dataCol2 = [
    {
        id: 'p2_1',
        title: 'anh8',
        img: './images/data/8.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p2_2',
        title: 'anh9',
        img: './images/data/9.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p2_3',
        title: 'anh10',
        img: './images/data/10.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p2_4',
        title: 'anh11',
        img: './images/data/11.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
];

// Cột 3: Gồm 3 ảnh
const dataCol3 = [
    {
        id: 'p3_1',
        title: 'anh12',
        img: './images/data/12.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p3_2',
        title: 'anh13',
        img: './images/data/13.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
    {
        id: 'p3_3',
        title: 'anh14',
        img: './images/data/14.webp',
        type: 'image',
        backgroundColor: '#72A0C1',
    },
];

// Hỗ trợ xuất dữ liệu cho môi trường Node.js / module nếu cần
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dataCol1, dataCol2, dataCol3 };
}
