import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Container, Heading, Input, VStack, HStack, Text, useToast, 
  Card, CardBody, Stat, StatLabel, StatNumber, Badge, IconButton,
  Select, Radio, RadioGroup, Stack, Divider, ButtonGroup, SimpleGrid,
  FormControl, FormLabel, InputGroup, InputRightElement
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, DownloadIcon } from '@chakra-ui/icons';
import StatisticsChart from './StatisticsChart';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Barcode from 'react-barcode';

const EXPENSE_CATS = ["飲食", "交通", "水電", "教育", "投資", "房租", "美裝與服飾", "通訊", "休閒", "其他"]; 
const INCOME_CATS = ["薪水", "兼職", "投資", "零用錢", "其他"];

function App() {
  const [records, setRecords] = useState([]);
  const [item, setItem] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense'); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mobileBarcode, setMobileBarcode] = useState('');
  const [rates, setRates] = useState({});
  const toast = useToast();

  const fetchRecords = async () => {
    try {
      const res = await fetch('https://my-accounting-app-1.onrender.com/api/records');
      const data = await res.json();
      setRecords(data);
    } catch (err) { console.error("連線錯誤:", err); }
  };

  const fetchRates = async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      const usdToTwd = data.rates.TWD; 
      setRates({
        USD: usdToTwd, 
        JPY: usdToTwd / data.rates.JPY, 
        EUR: usdToTwd / data.rates.EUR, 
        CNY: usdToTwd / data.rates.CNY  
      });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchRecords();
    fetchRates();
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMobileBarcode(text);
      toast({ title: "已貼上", status: "success", duration: 1000 });
    } catch (err) { toast({ title: "貼上失敗", status: "error" }); }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(records.map(r => ({
      日期: new Date(r.date).toLocaleDateString(),
      項目: r.item,
      類型: r.type === 'income' ? '收入' : '支出',
      分類: r.category,
      金額: r.cost,
      載具: r.mobileBarcode || ""
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "記帳紀錄");
    XLSX.writeFile(workbook, "我的記帳本.xlsx");
    toast({ title: "Excel 下載成功", status: "success" });
  };

  const exportToPDF = () => {
    const input = document.getElementById('record-list'); 
    if (!input) {
      toast({ title: "找不到資料區域", status: "error" });
      return;
    }
    toast({ title: "正在製作 PDF...", status: "info", duration: 1000 });

    html2canvas(input, { 
      scale: 2, 
      ignoreElements: (element) => element.classList.contains('pdf-hide')
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.text("My Accounting App (Recent 50)", 14, 10); 
      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight); 
      pdf.save("我的記帳本_Snapshot.pdf");
      
      toast({ title: "PDF 下載成功", status: "success" });
    }).catch(err => {
        console.error(err);
        toast({ title: "PDF 製作失敗", status: "error" });
    });
  };

  const handleSubmit = async () => {
    if(!item || !cost || !category || !date) {
        toast({ title: "請填寫完整", status: "warning" });
        return;
    }
    const newRecord = { item, cost: parseInt(cost), category, type, date: new Date(date), mobileBarcode };
    try {
      await fetch('https://my-accounting-app-1.onrender.com/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
      setItem(''); setCost(''); setCategory(''); setMobileBarcode('');
      setDate(new Date().toISOString().split('T')[0]);
      fetchRecords();
      toast({ title: "記帳成功", status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: "新增失敗", description: "請確認網路連線", status: "error" });
    }
  };

  const handleDelete = async (id) => {
      try {
        await fetch(`https://my-accounting-app-1.onrender.com/api/records/${id}`, { method: 'DELETE' });
        fetchRecords();
        toast({ title: "刪除成功", status: "info", duration: 1000 });
      } catch (err) { console.error(err); }
  }

  const totalBalance = records.reduce((acc, curr) => {
    if (curr.type === 'income') return acc + curr.cost;
    return acc - curr.cost; 
  }, 0);

  return (
    <Box bg="gray.50" minH="100vh" py={8}>
      <Container maxW="md">
        <VStack spacing={4} mb={6}>
          <Heading as="h1" size="lg" color="teal.600">我的記帳本 📒</Heading>
          <Card w="100%" bg="white" boxShadow="xl" borderRadius="xl">
              <CardBody textAlign="center">
                  <Stat>
                      <StatLabel fontSize="lg" color="gray.500">目前淨資產</StatLabel>
                      <StatNumber fontSize="4xl" color={totalBalance >= 0 ? "teal.500" : "red.500"} fontWeight="bold">
                        $ {totalBalance}
                      </StatNumber>
                  </Stat>
                  <ButtonGroup mt={4} size="sm" isAttached variant="outline">
                    <Button onClick={exportToExcel} leftIcon={<DownloadIcon />}>Excel</Button>
                    <Button onClick={exportToPDF} leftIcon={<DownloadIcon />}>PDF</Button>
                  </ButtonGroup>
              </CardBody>
          </Card>
        </VStack>

        <Card w="100%" mb={6} bg="blue.50" borderLeft="4px solid" borderColor="blue.400" boxShadow="sm">
            <CardBody py={3}>
            <Text fontSize="sm" fontWeight="bold" color="blue.600" mb={3}>🌍 即時匯率 (台幣計價)</Text>
            <SimpleGrid columns={4} spacing={2} textAlign="center">
              <Box><Text fontSize="xs">🇺🇸 美金</Text><Text fontWeight="bold">{rates.USD?.toFixed(2)}</Text></Box>
              <Box><Text fontSize="xs">🇯🇵 日圓</Text><Text fontWeight="bold">{rates.JPY?.toFixed(3)}</Text></Box>
              <Box><Text fontSize="xs">🇪🇺 歐元</Text><Text fontWeight="bold">{rates.EUR?.toFixed(2)}</Text></Box>
              <Box><Text fontSize="xs">🇨🇳 人民幣</Text><Text fontWeight="bold">{rates.CNY?.toFixed(2)}</Text></Box>
            </SimpleGrid>
            