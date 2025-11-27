import React, { useState, useMemo } from 'react';
import { 
  Box, Text, useColorModeValue, Tabs, TabList, TabPanels, Tab, TabPanel, 
  Center, Button, ButtonGroup, Flex, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Icon
} from '@chakra-ui/react';
import { InfoIcon, SearchIcon } from '@chakra-ui/icons';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';

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
    // 總資產模式：拿全部資料；收支模式：只拿該類型的資料
    const filteredByDate = data.filter(r => new Date(r.date) >= startDate);
    const targetData = chartCategory === 'net' 
        ? filteredByDate 
        : filteredByDate.filter(r => (r.type || 'expense') === chartCategory);

    // ==========================
    // 1. 處理圓餅圖數據
    // ==========================
    let calculatedPieData = [];
    if (chartCategory === 'net') {
        // 總資產模式：圓餅圖顯示「總收入 vs 總支出」
        const totalIncome = targetData.filter(r => r.type === 'income').reduce((acc, curr) => acc + curr.cost, 0);
        const totalExpense = targetData.filter(r => (r.type || 'expense') === 'expense').reduce((acc, curr) => acc + curr.cost, 0);
        if (totalIncome > 0 || totalExpense > 0) {
            calculatedPieData = [
                { name: '總收入', value: totalIncome, fill: '#38A169' }, // 綠色
                { name: '總支出', value: totalExpense, fill: '#E53E3E' }  // 紅色
            ];
        }
    } else {
        // 一般模式：依分類統計
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

    // Helper: 取得日期 Key (日: MM/DD, 月: YYYY-MM)
    const getDateKey = (dateStr) => {
        const d = new Date(dateStr);
        if (isMonthlyMode) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    if (chartCategory === 'net') {
        // --- 總資產趨勢 (累積餘額) ---
        // 為了算餘額，必須從「盤古開天闢地」開始算，不能只算 startDate 之後
        // 先把所有歷史資料排序
        const allSorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        let runningBalance = 0;
        const balanceMap = new Map();

        allSorted.forEach(record => {
            const amount = record.cost;
            if (record.type === 'income') runningBalance += amount;
            else runningBalance -= amount;

            // 記錄該時間點的餘額
            const key = getDateKey(record.date);
            // 如果是月模式，這裡會不斷更新該月的「最後餘額」
            balanceMap.set(key, { name: key, total: runningBalance, rawDate: new Date(record.date) });
        });

        // 過濾出 startDate 之後的點
        calculatedLineData = Array.from(balanceMap.values())
            .filter(item => item.rawDate >= startDate);

    } else {
        // --- 收入/支出趨勢 (區間加總) ---
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


  // 渲染圖表的函式 (重複利用)
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
