// Final Fix v20.0: REAL PDF Report (Vector Text + Chinese Font Support)
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
import 'jspdf-autotable'; // ✨ 引入表格套件
import Barcode from 'react-barcode';
import { Clipboard } from '@capacitor/clipboard';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
    const savedBarcode = localStorage.getItem('my_mobile_barcode');
    if (savedBarcode) {
      setMobileBarcode(savedBarcode);
    }
  }, []);

  const handlePaste = async () => {
    try {
      let text = '';
      try {
        const result = await Clipboard.read();
        text = result.value;
      } catch (nativeErr) {
        text = await navigator.clipboard.readText();
      }

      if (text) {
        setMobileBarcode(text);
        localStorage.setItem('my_mobile_barcode', text);
        toast({ title: "已貼上並記憶", status: "success", duration: 1000 });
      } else {
        toast({ title: "剪貼簿是空的", status: "warning", duration: 1000 });
      }
    } catch (err) { 
      console.error(err);
      toast({ title: "貼上失敗", description: "請確認剪貼簿權限", status: "error" }); 
    }
  };

  const handleBarcodeChange = (e) => {
      const val = e.target.value;
      setMobileBarcode(val);
      localStorage.setItem('my_mobile_barcode', val);
  }

  const exportToExcel = async () => {
    try {
      toast({ title: "正在製作 Excel...", status: "info", duration: 1000 });
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
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const fileName = `Accounting_${new Date().getTime()}.xlsx`;
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: excelBuffer,
        directory: Directory.Cache 
      });
      await Share.share({
        title: '分享 Excel 報表',
        url: savedFile.uri,
        dialogTitle: '儲存或分享 Excel'
      });
      toast({ title: "Excel 準備完成", status: "success" });
    } catch (err) {
      console.error("Excel Error:", err);
      try {
        const worksheet = XLSX.utils.json_to_sheet(records);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, "我的記帳本.xlsx");
      } catch (webErr) {
        toast({ title: "匯出失敗", description: "手機無法儲存", status: "error" });
      }
    }
  };

  // ✨✨✨ 真正的 PDF 產生器 (讀取 MyFont.ttf) ✨✨✨
  const exportToPDF = async () => {
    toast({ title: "正在製作 PDF...", description: "正在載入字型與生成報表", status: "info", duration: 2000 });

    try {
      const doc = new jsPDF();

      // 🔥 這裡會去抓 public/MyFont.ttf
      try {
        const response = await fetch('MyFont.ttf');
        if (!response.ok) throw new Error("找不到字型檔");
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.readAsDataURL(blob);
        reader.onloadend = async function() {
          const base64data = reader.result.split(',')[1];
          
          // 註冊字型
          doc.addFileToVFS('MyFont.ttf', base64data);
          doc.addFont('MyFont.ttf', 'MyFont', 'normal');
          doc.setFont('MyFont'); // 設定使用這個字型

          // 標題
          doc.setFontSize(18);
          doc.text("我的記帳本 - 收支明細", 105, 15, { align: "center" });
          
          doc.setFontSize(10);
          doc.text(`匯出日期: ${new Date().toLocaleDateString()}`, 105, 22, { align: "center" });
          doc.text(`總資產: $${totalBalance}`, 195, 22, { align: "right" });

          // 表格資料
          const tableColumn = ["日期", "項目", "分類", "類型", "金額", "載具號碼"];
          const tableRows = [];

          records.forEach(r => {
            const rowData = [
              new Date(r.date).toLocaleDateString(),
              r.item,
              r.category,
              r.type === 'income' ? '收入' : '支出',
              `$${r.cost}`,
              r.mobileBarcode || ""
            ];
            tableRows.push(rowData);
          });

          // 畫表格
          doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            styles: { 
              font: 'MyFont', // 指定表格內也用這個中文字型
              fontStyle: 'normal'
            },
            headStyles: { fillColor: [66, 133, 244] }, 
          });

          // 存檔與分享
          const pdfOutput = doc.output('datauristring');
          const base64Data = pdfOutput.split(',')[1];
          const fileName = `MyReport_${new Date().getTime()}.pdf`;

          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          await Share.share({
            title: '分享記帳報表',
            text: '這是您的正式 PDF 報表',
            url: savedFile.uri,
            dialogTitle: '下載或分享 PDF',
          });

          toast({ title: "PDF 製作成功", status: "success" });
        }
      } catch (fontErr) {
        console.error("Font Error:", fontErr);
        toast({ title: "字型載入失敗", description: "請確認 public/MyFont.ttf 是否存在", status: "error" });
      }

    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast({ title: "PDF 失敗", description: err.message, status: "error" });
    }
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
      setItem(''); setCost(''); setCategory(''); 
      setDate(new Date().toISOString().split('T')[0]);
      fetchRecords();
      toast({ title: "記帳成功", status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: "新增失敗", status: "error" });
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
    <Box bg="gray.50" minH="100vh" py={8} overflowX="hidden" w="100vw">
      <Container maxW="md"> 
        <VStack spacing={4} mb={6}>
          <Heading as="h1" size="lg" color="teal.600">我的記帳本 📒 (v20.0)</Heading>
          
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
                        <FormLabel fontSize="sm" color="gray.500">載具號碼 (自動記憶)</FormLabel>
                        <InputGroup>
                            <Input 
                                placeholder="/ABC.123" 
                                value={mobileBarcode} 
                                onChange={handleBarcodeChange} 
                                variant="filled" 
                            />
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

        <VStack id="record-list" w="100%" spacing={3} align="stretch" bg="gray.50" p={2} pb={40}>
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
