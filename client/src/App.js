// Final Fix v10.0: Multi-page PDF Support (Auto Pagination)
import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Container, Heading, Input, VStack, HStack, Text, useToast, 
  Card, CardBody, Stat, StatLabel, StatNumber, Badge, IconButton,
  Select, Radio, RadioGroup, Stack, Divider, ButtonGroup, SimpleGrid,
  FormControl, FormLabel, InputGroup, InputRightElement, Flex, Collapse
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

  // ✨✨✨ v10.0 修改：支援多頁 PDF 匯出 ✨✨✨
  const exportToPDF = () => {
    const input = document.getElementById('pdf-report-view');
    if (!input) {
      toast({ title: "找不到報表區域", status: "error" });
      return;
    }
    toast({ title: "正在製作 PDF...", status: "info", duration: 1000 });

    html2canvas(input, { 
      scale: 2, 
      useCORS: true 
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 寬度 (mm)
      const pageHeight = 297; // A4 高度 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // 依比例計算圖片高度
      
      let heightLeft = imgHeight;
      let position = 0;

      // 第一頁
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果還有剩餘高度，就新增頁面繼續貼
      while (heightLeft >= 0) {
        position = position - pageHeight; // 將圖片往上推，顯示下一部分
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save("我的記帳本_完整報表.pdf");
      
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
      
      {/* PDF 報表專用區 (隱藏) - 移除固定高度，讓它自動長高以便切割 */}
      <Box position="fixed" left="-9999px" top="0" id="pdf-report-view" bg="white" p={10} width="210mm" minH="297mm">
        <Heading size="lg" mb={2} textAlign="center" color="black">我的記帳本 - 收支明細</Heading>
        <Text textAlign="center" mb={6} color="gray.600">匯出日期: {new Date().toLocaleDateString()}</Text>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid #333', backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>日期</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>項目</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>分類</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>類型</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>金額</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>載具號碼</th>
                </tr>
            </thead>
            <tbody>
                {records.map((r, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px' }}>{new Date(r.date).toLocaleDateString()}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{r.item}</td>
                        <td style={{ padding: '8px' }}>{r.category}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: r.type === 'income' ? 'green' : 'red' }}>
                            {r.type === 'income' ? '收入' : '支出'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>${r.cost}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{r.mobileBarcode}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <Box mt={8} textAlign="right">
             <Text fontSize="xl" fontWeight="bold">總資產: ${totalBalance}</Text>
        </Box>
      </Box>

      <Container maxW="md">
        <VStack spacing={4} mb={6}>
          {/* v10.0 標題 */}
          <Heading as="h1" size="lg" color="teal.600">我的記帳本 📒 (v10.0)</Heading>
          
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

        {/* 輸入區域 (保持 v8.0 的 Code 39 預覽) */}
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
                    
                    {/* 輸入預覽區：Code 39 格式 */}
                    <FormControl>
                        <FormLabel fontSize="sm" color="gray.500">載具號碼 (可選)</FormLabel>
                        <InputGroup>
                            <Input placeholder="/ABC.123" value={mobileBarcode} onChange={(e) => setMobileBarcode(e.target.value)} variant="filled" />
                            <InputRightElement width="4.5rem"><Button h="1.75rem" size="sm" onClick={handlePaste}>貼上</Button></InputRightElement>
                        </InputGroup>
                        <Collapse in={mobileBarcode.length > 0} animateOpacity>
                            <Box mt={3} p={2} bg="gray.100" borderRadius="md" textAlign="center" border="1px dashed" borderColor="gray.300">
                                <Text fontSize="xs" color="gray.500" mb={1}>載具預覽 (Code 39)</Text>
                                <Box display="flex" justifyContent="center">
                                    <Barcode 
                                        value={mobileBarcode || "Preview"} 
                                        format="CODE39"   
                                        height={50}       
                                        fontSize={14}
                                        width={1.5}
                                        background="transparent"
                                    />
                                </Box>
                            </Box>
                        </Collapse>
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

        {/* 紀錄列表 (維持乾淨版面) */}
        <VStack id="record-list" w="100%" spacing={3} align="stretch" bg="gray.50" p={2}>
            {records.slice(0, 50).map((record) => (
                <Card key={record._id} bg="white" shadow="sm" borderRadius="lg" overflow="hidden" borderLeft="4px solid" borderColor={(record.type === 'income') ? "green.400" : "red.400"}>
                    <CardBody py={3} px={4}>
                        <Flex justify="space-between" align="center">
                            
                            <VStack align="start" spacing={1} maxW="65%">
                                <Text fontWeight="bold" fontSize="md" noOfLines={1}>{record.item}</Text>
                                
                                <HStack spacing={2} wrap="wrap">
                                  <Badge className="pdf-hide" data-html2canvas-ignore="true" colorScheme={(record.type === 'income') ? "green" : "red"}>{(record.type === 'income') ? "收" : "支"}</Badge>
                                  <Badge className="pdf-hide" data-html2canvas-ignore="true" colorScheme="purple" variant="outline">{record.category}</Badge>
                                </HStack>

                                <Text fontSize="xs" color="gray.400">{new Date(record.date).toLocaleDateString()}</Text>
                            </VStack>

                            <HStack>
                                <Text fontWeight="bold" fontSize="lg" color={(record.type === 'income') ? "green.500" : "red.500"} whiteSpace="nowrap">
                                    {(record.type === 'income') ? "+ " : "- "} ${record.cost}
                                </Text>
                                <IconButton className="pdf-hide" data-html2canvas-ignore="true" icon={<DeleteIcon />} size="sm" colorScheme="gray" variant="ghost" onClick={() => handleDelete(record._id)}/>
                            </HStack>
                        </Flex>
                    </CardBody>
                </Card>
            ))}
        </VStack>

      </Container>
    </Box>
  );
}

export default App;
// Final V10 Force Update

