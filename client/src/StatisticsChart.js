import React, { useState, useMemo } from 'react';
import { 
  Box, Text, useColorModeValue, Tabs, TabList, TabPanels, Tab, TabPanel, 
  Center, Button, ButtonGroup, Flex, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Icon, useToast
} from '@chakra-ui/react';
// 引入下載圖示
import { DownloadIcon } from '@chakra-ui/icons'; 
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';

// --- PDF 相關引入 ---
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// ✅ 路徑修正：因為檔案都在 src 資料夾，所以用 './NotoFont'
import { notoBase64 } from './NotoFont'; 

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#38B2AC', '#805AD5'];

// 時間範圍設定
const TIME_RANGES = [
  { label: '1月', days: 30 },
  { label: '半年', days: 180 },
  { label: '1年', days: 365 },
  { label: '3年', days: 365 * 3 },
  { label: '5年', days: 365 * 5 },
];

const StatisticsChart = ({ data }) => {
  const bg = useColorModeValue("white", "gray.800");
  const { isOpen, onOpen, onClose } = useDisclosure(); // 控制放大視窗
  const [zoomType, setZoomType] = useState('line'); // 記錄現在是放大圓餅圖還是折線圖
  const toast = useToast(); // 用來顯示成功或失敗的提示
  
  // 狀態管理
  const [chartCategory, setChartCategory] = useState('expense'); // 'expense' | 'income' | 'net'
  const [timeRange, setTimeRange] = useState(30); // 預設 30 天

  // 資料處理核心
  const { pieData, lineData, isMonthly } = useMemo(() => {
    if (!data || data.length === 0) return { pieData: [], lineData: [], isMonthly: false };

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - timeRange);

    // 判斷顆粒度：如果超過 90 天(3個月)，就改用「月」為單位，否則用「日」
    const isMonthlyMode = timeRange > 90;

    // --- 資料過濾 ---
    const filteredByDate = data.filter(r => new Date(r.date) >= startDate);
    const targetData = chartCategory === 'net' 
        ? filteredByDate 
        : filteredByDate.filter(r => (r.type || 'expense') === chartCategory);

    // ==========================
    // 1. 處理圓餅圖數據
    // ==========================
    let calculatedPieData = [];
    if (chartCategory === 'net') {
        const totalIncome = targetData.filter(r => r.type === 'income').reduce((acc, curr) => acc + curr.cost, 0);
        const totalExpense = targetData.filter(r => (r.type || 'expense') === 'expense').reduce((acc, curr) => acc + curr.cost, 0);
        if (totalIncome > 0 || totalExpense > 0) {
            calculatedPieData = [
                { name: '總收入', value: totalIncome, fill: '#38A169' }, // 綠色
                { name: '總支出', value: totalExpense, fill: '#E53E3E' }  // 紅色
            ];
        }
    } else {
        calculatedPieData = targetData.reduce((acc, curr) => {
            const catName = curr.category || "其他";
            const found = acc.find(item => item.name === catName);
            if (found) { found.value += curr.cost; } 
            else { acc.push({ name: catName, value: curr.cost }); }
            return acc;
        }, []);
    }

    // ==========================
    // 2. 處理折線圖數據
    // ==========================
    let calculatedLineData = [];

    const getDateKey = (dateStr) => {
        const d = new Date(dateStr);
        if (isMonthlyMode) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    if (chartCategory === 'net') {
        const allSorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        let runningBalance = 0;
        const balanceMap = new Map();

        allSorted.forEach(record => {
            const amount = record.cost;
            if (record.type === 'income') runningBalance += amount;
            else runningBalance -= amount;

            const key = getDateKey(record.date);
            balanceMap.set(key, { name: key, total: runningBalance, rawDate: new Date(record.date) });
        });

        calculatedLineData = Array.from(balanceMap.values())
            .filter(item => item.rawDate >= startDate);

    } else {
        const groupMap = targetData.reduce((acc, curr) => {
            const key = getDateKey(curr.date);
            if (!acc[key]) {
                acc[key] = { name: key, total: 0, rawDate: new Date(curr.date) };
            }
            acc[key].total += curr.cost;
            return acc;
        }, {});
        calculatedLineData = Object.values(groupMap).sort((a, b) => a.rawDate - b.rawDate);
    }

    return { pieData: calculatedPieData, lineData: calculatedLineData, isMonthly: isMonthlyMode };

  }, [data, chartCategory, timeRange]);


  // ==========================
  // ✨ PDF 匯出功能 (修正版)
  // ==========================
  const exportPDF = () => {
    try {
        if (!data || data.length === 0) {
            toast({ title: "無資料可匯出", status: "warning", duration: 2000 });
            return;
        }

        const doc = new jsPDF();

        // 1. 設定中文字型 (解決 Android 亂碼關鍵)
        const fontFileName = "NotoSansTC-Regular.ttf";
        // 將 Base64 注入虛擬檔案系統
        doc.addFileToVFS(fontFileName, notoBase64);
        // 註冊字型
        doc.addFont(fontFileName, "NotoSansTC", "normal");
        // 設定字型
        doc.setFont("NotoSansTC");

        // 2. 準備要列印的資料
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - timeRange);
        
        // 依照目前的分類 (ChartCategory) 篩選資料
        let reportData = data.filter(r => new Date(r.date) >= startDate);
        if (chartCategory !== 'net') {
            reportData = reportData.filter(r => (r.type || 'expense') === chartCategory);
        }
        // 依照日期排序 (新 -> 舊)
        reportData.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 3. 繪製標題
        doc.setFontSize(20);
        const titleMap = { expense: '支出報表', income: '收入報表', net: '總資產變動報表' };
        doc.text(`我的記帳本 - ${titleMap[chartCategory]}`, 105, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`匯出日期: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });

        // 4. 繪製表格
        const tableColumn = ["日期", "項目", "類別", "金額"];
        const tableRows = reportData.map(item => [
            new Date(item.date).toLocaleDateString(),
            item.title,
            item.category || '-',
            // 根據收支加正負號
            item.type === 'income' ? `+${item.cost}` : `-${item.cost}`
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            styles: { font: "NotoSansTC", fontStyle: "normal" }, // 表格內也要指定字型
            headStyles: { fillColor: chartCategory === 'income' ? [56, 161, 105] : [229, 62, 62] },
        });

        // 5. 存檔
        const fileName = `Report_${chartCategory}_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
        
        toast({ title: "PDF 下載成功", description: `檔案: ${fileName}`, status: "success", duration: 2000 });

    } catch (error) {
        console.error("PDF Error:", error);
        toast({ title: "匯出失敗", description: error.message, status: "error", duration: 3000 });
    }
  };


  // 渲染圖表的函式
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      {chartCategory === 'net' ? (
        <AreaChart data={lineData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3182ce" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3182ce" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <XAxis dataKey="name" fontSize={12} tickCount={5} />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Area type="monotone" dataKey="total" stroke="#3182ce" fillOpacity={1} fill="url(#colorTotal)" name="累計資產" />
        </AreaChart>
      ) : (
        <LineChart data={lineData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} tickCount={5} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
                type="monotone" 
                dataKey="total" 
                stroke={chartCategory === 'income' ? '#38A169' : '#E53E3E'} 
                strokeWidth={3} 
                activeDot={{ r: 8 }} 
                name={chartCategory === 'income' ? '每日收入' : '每日支出'}
            />
        </LineChart>
      )}
    </ResponsiveContainer>
  );

  if (!data || data.length === 0) return null;

  return (
    <>
    <Box p={5} bg={bg} borderRadius="xl" boxShadow="md" mb={6}>
      
      {/* 類別切換 */}
      <Flex direction="column" gap={4} mb={4}>
        <ButtonGroup isAttached variant="outline" width="100%">
          <Button flex={1} colorScheme="red" variant={chartCategory === 'expense' ? 'solid' : 'outline'} onClick={() => setChartCategory('expense')}>支出</Button>
          <Button flex={1} colorScheme="green" variant={chartCategory === 'income' ? 'solid' : 'outline'} onClick={() => setChartCategory('income')}>收入</Button>
          <Button flex={1} colorScheme="blue" variant={chartCategory === 'net' ? 'solid' : 'outline'} onClick={() => setChartCategory('net')}>總資產</Button>
        </ButtonGroup>

        {/* 時間濾鏡 */}
        <Center>
            <ButtonGroup size="xs" isAttached variant="solid" colorScheme="teal">
                {TIME_RANGES.map(range => (
                    <Button key={range.label} onClick={() => setTimeRange(range.days)} opacity={timeRange === range.days ? 1 : 0.4}>
                        {range.label}
                    </Button>
                ))}
            </ButtonGroup>
        </Center>
        
        {/* 顯示目前顆粒度提示 */}
        <Text fontSize="xs" textAlign="center" color="gray.400">
            統計單位：{isMonthly ? '月' : '日'} (點擊圖表可放大)
        </Text>
      </Flex>

      <Tabs variant='soft-rounded' colorScheme={chartCategory === 'net' ? 'blue' : (chartCategory === 'income' ? 'green' : 'red')} isFitted>
        <TabList mb={4}>
          <Tab onClick={() => setZoomType('pie')}>圓餅圖</Tab>
          <Tab onClick={() => setZoomType('line')}>折線圖</Tab>
        </TabList>

        <TabPanels>
          {/* 圓餅圖 */}
          <TabPanel height="300px" onClick={onOpen} cursor="pointer" _hover={{ bg: "gray.50" }} borderRadius="md" transition="0.2s">
            {pieData.length === 0 ? <Center h="100%"><Text color="gray.400">無資料</Text></Center> : renderPieChart()}
          </TabPanel>

          {/* 折線圖 */}
          <TabPanel height="300px" onClick={onOpen} cursor="pointer" _hover={{ bg: "gray.50" }} borderRadius="md" transition="0.2s">
             {lineData.length === 0 ? <Center h="100%"><Text color="gray.400">無資料</Text></Center> : renderLineChart()}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* ✅ PDF 匯出按鈕區 */}
      <Flex justify="center" mt={4}>
         <Button 
            leftIcon={<DownloadIcon />} 
            colorScheme="gray" 
            variant="outline" 
            size="sm"
            onClick={exportPDF}
         >
            匯出 {chartCategory === 'expense' ? '支出' : (chartCategory === 'income' ? '收入' : '資產')} PDF 報表
         </Button>
      </Flex>

    </Box>

    {/* ✨ 放大顯示的 Modal (彈出視窗) ✨ */}
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent height="500px">
          <ModalHeader>詳細圖表檢視</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
             {/* 根據目前選的分頁顯示對應圖表 */}
             {zoomType === 'pie' ? renderPieChart() : renderLineChart()}
          </ModalBody>
        </ModalContent>
    </Modal>
    </>
  );
};

export default StatisticsChart;
