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
          </CardBody>
        </Card>

        <StatisticsChart data={records} currentType={type} />

        <Card w="100%" mb={6} boxShadow="md" borderRadius="lg">
            <CardBody>
                <VStack spacing={4}>
                    <RadioGroup onChange={setType} value={type} w="100%">
                      <Stack direction='row' justify="center" spacing={6}>
                        <Radio value='expense' colorScheme='red' size="lg">🔴 支出</Radio>
                        <Radio value='income' colorScheme='green' size="lg">🟢 收入</Radio>
                      </Stack>
                    </RadioGroup>
                    <Divider />
                    <FormControl>
                        <FormLabel fontSize="sm" color="gray.500">日期</FormLabel>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} variant="filled" />
                    </FormControl>
                    <FormControl>
                        <FormLabel fontSize="sm" color="gray.500">載具號碼 (可選)</FormLabel>
                        <InputGroup>
                            <Input placeholder="/ABC.123" value={mobileBarcode} onChange={(e) => setMobileBarcode(e.target.value)} variant="filled" />
                            <InputRightElement width="4.5rem"><Button h="1.75rem" size="sm" onClick={handlePaste}>貼上</Button></InputRightElement>
                        </InputGroup>
                    </FormControl>
                    <Input placeholder="項目 (ex: 午餐)" value={item} onChange={(e) => setItem(e.target.value)} variant="filled"/>
                    <Select placeholder="請選擇分類" value={category} onChange={(e) => setCategory(e.target.value)} variant="filled">
                        {(type === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </Select>
                    <Input placeholder="金額" type="number" value={cost} onChange={(e) => setCost(e.target.value)} variant="filled"/>
                    <Button colorScheme={type === 'expense' ? "red" : "green"} w="100%" onClick={handleSubmit} leftIcon={<AddIcon />}>
                        {type === 'expense' ? "新增支出" : "新增收入"}
                    </Button>
                </VStack>
            </CardBody>
        </Card>

        <VStack id="record-list" w="100%" spacing={3} align="stretch" bg="gray.50" p={2}>
            {records.slice(0, 50).map((record) => (
                <Card key={record._id} bg="white" shadow="sm" borderRadius="lg" overflow="hidden" borderLeft="4px solid" borderColor={(record.type === 'income') ? "green.400" : "red.400"}>
                    <CardBody py={3} px={4}>
                        <HStack justify="space-between">
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold">{record.item}</Text>
                                <HStack>
                                  <Badge className="pdf-hide" data-html2canvas-ignore="true" colorScheme={(record.type === 'income') ? "green" : "red"}>{(record.type === 'income') ? "收" : "支"}</Badge>
                                  <Badge className="pdf-hide" data-html2canvas-ignore="true" colorScheme="purple" variant="outline">{record.category}</Badge>
                                  
                                  {/* 文字版載具 (確保一定看得到) */}
                                  {record.mobileBarcode && (
                                      <Badge colorScheme="gray" variant="solid" mt={1} fontSize="0.7em">📱 {record.mobileBarcode}</Badge>
                                  )}
                                </HStack>
                                
                                {/* ✨✨✨ 這裡改了：加上 displayValue={false} 隱藏條碼下的文字 ✨✨✨ */}
                                {record.mobileBarcode && (
                                  <Box mt={2} className="pdf-hide" data-html2canvas-ignore="true">
                                    <Barcode 
                                        value={record.mobileBarcode} 
                                        height={30} 
                                        fontSize={12} 
                                        width={1.2} 
                                        margin={0} 
                                        displayValue={false} // 👈 關鍵：不顯示文字，只顯示條碼
                                        background="transparent"
                                    />
                                  </Box>
                                )}

                                <Text fontSize="xs" color="gray.400">{new Date(record.date).toLocaleDateString()}</Text>
                            </VStack>
                            <HStack>
                                <Text fontWeight="bold" color={(record.type === 'income') ? "green.500" : "red.500"}>
                                    {(record.type === 'income') ? "+ " : "- "} ${record.cost}
                                </Text>
                                <IconButton className="pdf-hide" data-html2canvas-ignore="true" icon={<DeleteIcon />} size="sm" colorScheme="gray" variant="ghost" onClick={() => handleDelete(record._id)}/>
                            </HStack>
                        </HStack>
                    </CardBody>
                </Card>
            ))}
        </VStack>

      </Container>
    </Box>
  );
}

export default App;
// Force Vercel Update: 2025-11-29 v2
// Fix Vercel Deploy 01
import React, { useState, useEffect } from 'react';
...