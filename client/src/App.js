import React, { useState, useEffect } from 'react';
// 1. 引入 Chakra UI 的所有漂亮組件
import { 
  Box, 
  Button, 
  Container, 
  Heading, 
  Input, 
  VStack, 
  HStack, 
  Text, 
  useToast,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  IconButton
} from '@chakra-ui/react';
// 2. 引入圖示
import { DeleteIcon, AddIcon } from '@chakra-ui/icons';
// 3. 引入我們剛剛做好的圓餅圖組件
import StatisticsChart from './StatisticsChart';

function App() {
  // --- 狀態變數 ---
  const [records, setRecords] = useState([]); // 記帳列表
  const [item, setItem] = useState('');       // 輸入的項目
  const [cost, setCost] = useState('');       // 輸入的金額
  const toast = useToast();                   // 提示訊息

  // --- API 1: 讀取資料 ---
  const fetchRecords = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/records');
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error("連線錯誤:", err);
      // 如果後端沒開，這裡會報錯，但不影響畫面顯示
    }
  };

  // 畫面載入時，自動抓一次資料
  useEffect(() => {
    fetchRecords();
  }, []);

  // --- API 2: 新增資料 ---
  const handleSubmit = async () => {
    // 檢查有沒有輸入
    if(!item || !cost) {
        toast({ title: "請輸入項目和金額", status: "warning", duration: 2000 });
        return;
    }

    const newRecord = { item, cost: parseInt(cost) };
    
    try {
      await fetch('http://localhost:5000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
      // 清空輸入框
      setItem('');
      setCost('');
      // 重新整理列表
      fetchRecords(); 
      toast({ title: "記帳成功！", status: "success", duration: 2000 });
    } catch (err) {
      console.error(err);
      toast({ title: "新增失敗", status: "error" });
    }
  };

  // --- API 3: 刪除資料 ---
  const handleDelete = async (id) => {
      try {
        await fetch(`http://localhost:5000/api/records/${id}`, { method: 'DELETE' });
        fetchRecords(); // 重新抓取
        toast({ title: "已刪除", status: "info", duration: 1000 });
      } catch (err) {
          console.error(err);
      }
  }

  // 計算總金額
  const total = records.reduce((acc, curr) => acc + curr.cost, 0);

  // --- 畫面渲染區 ---
  return (
    // 最外層背景
    <Box bg="gray.50" minH="100vh" py={8}>
      <Container maxW="md"> {/* 限制寬度，模擬手機介面 */}
        
        {/* 區塊 1：標題與總金額 */}
        <VStack spacing={4} mb={6}>
          <Heading as="h1" size="lg" color="teal.600">我的記帳本 📒</Heading>
          
          <Card w="100%" bg="white" boxShadow="xl" borderRadius="xl">
              <CardBody textAlign="center">
                  <Stat>
                      <StatLabel fontSize="lg" color="gray.500">本月總支出</StatLabel>
                      <StatNumber fontSize="4xl" color="red.500" fontWeight="bold">
                        ${total}
                      </StatNumber>
                  </Stat>
              </CardBody>
          </Card>
        </VStack>

        {/* 區塊 2：圓餅圖 (把資料傳進去) */}
        <StatisticsChart data={records} />

        {/* 區塊 3：輸入框 */}
        <Card w="100%" mb={6} boxShadow="md" borderRadius="lg">
            <CardBody>
                <VStack spacing={3}>
                    <Input 
                        placeholder="消費項目 (例如: 珍珠奶茶)" 
                        value={item} 
                        onChange={(e) => setItem(e.target.value)} 
                        size="lg"
                        variant="filled"
                    />
                    <Input 
                        placeholder="金額" 
                        type="number" 
                        value={cost} 
                        onChange={(e) => setCost(e.target.value)} 
                        size="lg"
                        variant="filled"
                    />
                    <Button 
                        colorScheme="teal" 
                        size="lg" 
                        w="100%" 
                        onClick={handleSubmit}
                        leftIcon={<AddIcon />}
                        mt={2}
                    >
                        新增一筆
                    </Button>
                </VStack>
            </CardBody>
        </Card>

        {/* 區塊 4：列表清單 */}
        <VStack w="100%" spacing={3} align="stretch">
            <Text fontSize="sm" color="gray.500" ml={1}>近期消費紀錄</Text>
            
            {records.map((record) => (
                <Card key={record.id} bg="white" shadow="sm" borderRadius="lg" overflow="hidden">
                    <CardBody py={3} px={4}>
                        <HStack justify="space-between">
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" fontSize="md" color="gray.700">
                                  {record.item}
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                  {new Date().toLocaleDateString()}
                                </Text>
                            </VStack>
                            
                            <HStack>
                                <Badge colorScheme="orange" fontSize="0.9em" borderRadius="md" px={2} py={1}>
                                  ${record.cost}
                                </Badge>
                                <IconButton 
                                    aria-label="刪除"
                                    icon={<DeleteIcon />}
                                    size="sm" 
                                    colorScheme="red" 
                                    variant="ghost" 
                                    onClick={() => handleDelete(record.id)}
                                />
                            </HStack>
                        </HStack>
                    </CardBody>
                </Card>
            ))}
            
            {records.length === 0 && (
              <Text textAlign="center" color="gray.400" mt={4}>目前沒有紀錄，快去記帳吧！</Text>
            )}
        </VStack>

      </Container>
    </Box>
  );
}

export default App;
