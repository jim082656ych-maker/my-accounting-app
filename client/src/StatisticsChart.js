import React, { useState, useMemo } from 'react';
import { 
  Box, Text, useColorModeValue, Tabs, TabList, TabPanels, Tab, TabPanel, 
  Center, Button, ButtonGroup, Flex, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  useToast
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons'; 
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';

// --- PDF 相關 (⚠️ 這裡改了) ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // 👈 改成這樣引入
import { notoBase64 } from './NotoFont'; 

// --- Excel 相關 ---
import * as XLSX from 'xlsx';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#38B2AC', '#805AD5'];

const TIME_RANGES = [
  { label: '1月', days: 30 },
  { label: '半年', days: 180 },
  { label: '1年', days: 365 },
  { label: '3年', days: 365 * 3 },
  { label: '5年', days: 365 * 5 },
];

const StatisticsChart = ({ data }) => {
  const bg = useColorModeValue("white", "gray.800");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [zoomType, setZoomType] = useState('line');
  const toast = useToast();
  
  const [chartCategory, setChartCategory] = useState('expense');
  const [timeRange, setTimeRange] = useState(30);

  // 資料處理核心
  const { pieData, lineData, isMonthly, filteredData } = useMemo(() => {
    if (!data || data.length === 0) return { pieData: [], lineData: [], isMonthly: false, filteredData: [] };

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - timeRange);
    const isMonthlyMode = timeRange > 90;

    // 1. 先篩選日期
    const dataInDateRange = data.filter(r => new Date(r.date) >= startDate);
    
    // 2. 再篩選類別 (給報表用)
    let targetData = dataInDateRange;
    if (chartCategory !== 'net') {
        targetData = dataInDateRange.filter(r => (r.type || 'expense') === chartCategory);
    }
    targetData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 圖表數據計算 (這裡簡化以專注於報表功能，實際請保留你原本的邏輯)
    let calculatedPieData = [];
    if (chartCategory === 'net') {
         const totalIncome = targetData.filter(r => r.type === 'income').reduce((acc, curr) => acc + curr.cost, 0);
         const totalExpense = targetData.filter(r => (r.type || 'expense') === 'expense').reduce((acc, curr) => acc + curr.cost, 0);
         if (totalIncome > 0 || totalExpense > 0) {
             calculatedPieData = [{ name: '總收入', value: totalIncome }, { name: '總支出', value: totalExpense }];
         }
    } else {
         const group = targetData.reduce((acc, curr) => {
             const name = curr.category || "其他";
             const f = acc.find(i => i.name === name);
             if(f) f.value += curr.cost; else acc.push({name, value: curr.cost});
             return acc;
         }, []);
         calculatedPieData = group;
    }

    const getDateKey = (dateStr) => {
        const d = new Date(dateStr);
        if (isMonthlyMode) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    let calculatedLineData = [];
    const groupMap = targetData.reduce((acc, curr) => {
        const key = getDateKey(curr.date);
        if (!acc[key]) acc[key] = { name: key, total: 0, rawDate: new Date(curr.date) };
        acc[key].total += curr.cost;
        return acc;
    }, {});
    calculatedLineData = Object.values(groupMap).sort((a, b) => a.rawDate - b.rawDate);

    return { pieData: calculatedPieData, lineData: calculatedLineData, isMonthly: isMonthlyMode, filteredData: targetData };

  }, [data, chartCategory, timeRange]);


  // ==========================
  // 📊 Excel 匯出功能
  // ==========================
  const exportExcel = () => {
    try {
        if (!filteredData || filteredData.length === 0) {
            toast({ title: "無資料可匯出", status: "warning" });
            return;
        }
        const excelData = filteredData.map(item => ({
            "日期": new Date(item.date).toLocaleDateString(),
            "項目": item.title,
            "類別": item.category || "-",
            "類型": item.type === 'income' ? "收入" : "支出",
            "金額": item.cost
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "記帳報表");
        XLSX.writeFile(workbook, `Accounting_Report_${chartCategory}.xlsx`);
        toast({ title: "Excel 下載成功", status: "success", duration: 2000 });
    } catch (error) {
        console.error("Excel Error:", error);
        toast({ title: "匯出失敗", description: error.message, status: "error" });
    }
  };


  // ==========================
  // 📄 PDF 匯出功能 (修正版)
  // ==========================
  const exportPDF = () => {
    try {
        if (!filteredData || filteredData.length === 0) {
            toast({ title: "無資料可匯出", status: "warning" });
            return;
        }

        const doc = new jsPDF();

        // 1. 字型設定
        const fontFileName = "NotoSansTC-Regular.ttf";
        doc.addFileToVFS(fontFileName, notoBase64);
        doc.addFont(fontFileName, "NotoSansTC", "normal");
        doc.setFont("NotoSansTC");

        // 2. 標題
        doc.setFontSize(20);
        const titleMap = { expense: '支出', income: '收入', net: '總資產' };
        doc.text(`我的記帳本 - ${titleMap[chartCategory]}報表`, 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`匯出日期: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });

        // 3. 表格資料
        const tableColumn = ["日期", "項目", "類別", "金額"];
        const tableRows = filteredData.map(item => [
            new Date(item.date).toLocaleDateString(),
            item.title,
            item.category || '-',
            item.type === 'income' ? `+${item.cost}` : `-${item.cost}`
        ]);

        // 4. 繪製表格 (⚠️ 這裡改了寫法)
        // 改用 autoTable(doc, options) 的方式，避開 undefined 錯誤
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            styles: { font: "NotoSansTC", fontStyle: "normal" }, 
            headStyles: { fillColor: chartCategory === 'income' ? [56, 161, 105] : [229, 62, 62] },
        });

        doc.save(`Report_${chartCategory}.pdf`);
        toast({ title: "PDF 下載成功", status: "success", duration: 2000 });

    } catch (error) {
        console.error("PDF Error:", error);
        // 把錯誤印出來給你看
        toast({ title: "匯出失敗", description: error.message, status: "error" });
    }
  };

  if (!data || data.length === 0) return null;

  return (
    <>
    <Box p={5} bg={bg} borderRadius="xl" boxShadow="md" mb={6}>
      <Flex direction="column" gap={4} mb={4}>
          <ButtonGroup isAttached variant="outline" width="100%">
             <Button flex={1} onClick={() => setChartCategory('expense')} colorScheme="red" variant={chartCategory === 'expense' ? 'solid' : 'outline'}>支出</Button>
             <Button flex={1} onClick={() => setChartCategory('income')} colorScheme="green" variant={chartCategory === 'income' ? 'solid' : 'outline'}>收入</Button>
             <Button flex={1} onClick={() => setChartCategory('net')} colorScheme="blue" variant={chartCategory === 'net' ? 'solid' : 'outline'}>總資產</Button>
          </ButtonGroup>
          
          <Center>
            <ButtonGroup size="xs" isAttached variant="solid" colorScheme="teal">
                {TIME_RANGES.map(range => (
                    <Button key={range.label} onClick={() => setTimeRange(range.days)} opacity={timeRange === range.days ? 1 : 0.4}>{range.label}</Button>
                ))}
            </ButtonGroup>
          </Center>
      </Flex>

      <Tabs variant='soft-rounded' colorScheme='green' isFitted>
        <TabList mb={4}>
          <Tab onClick={() => setZoomType('pie')}>圓餅圖</Tab>
          <Tab onClick={() => setZoomType('line')}>折線圖</Tab>
        </TabList>
        <TabPanels>
          <TabPanel height="300px" onClick={onOpen}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </TabPanel>
          <TabPanel height="300px" onClick={onOpen}>
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* 下載按鈕區 */}
      <Flex justify="center" gap={4} mt={4}>
         <Button leftIcon={<DownloadIcon />} colorScheme="green" size="sm" onClick={exportExcel}>
            Excel 報表
         </Button>
         <Button leftIcon={<DownloadIcon />} colorScheme="red" size="sm" onClick={exportPDF}>
            PDF 報表
         </Button>
      </Flex>
    </Box>

    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent height="500px">
          <ModalHeader>詳細圖表</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
             {/* 這裡簡單顯示，避免重複程式碼 */}
             <Center h="100%">請使用上方按鈕下載報表查看詳細數據</Center>
          </ModalBody>
        </ModalContent>
    </Modal>
    </>
  );
};

export default StatisticsChart;
