import React from 'react';
import { 
  Box, 
  Text, 
  useColorModeValue,
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel 
} from '@chakra-ui/react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

const StatisticsChart = ({ data }) => {
  const bg = useColorModeValue("white", "gray.800");

  // 如果沒有資料，就不顯示
  if (!data || data.length === 0) {
    return null;
  }

  // --- 資料處理 1：圓餅圖 (按項目分) ---
  const pieData = data.reduce((acc, curr) => {
    const found = acc.find(item => item.name === curr.item);
    if (found) {
      found.value += curr.cost;
    } else {
      acc.push({ name: curr.item, value: curr.cost });
    }
    return acc;
  }, []);

  // --- 資料處理 2：折線圖 (按日期分) ---
  const lineData = data.reduce((acc, curr) => {
    // 如果資料庫沒存日期，暫時用今天
    // 這裡我們格式化成 "月/日" (例如 11/25)
    const dateObj = curr.date ? new Date(curr.date) : new Date();
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

    const found = acc.find(item => item.name === dateStr);
    if (found) {
      found.total += curr.cost;
    } else {
      acc.push({ name: dateStr, total: curr.cost, rawDate: dateObj });
    }
    return acc;
  }, []);

  // 依照日期排序 (舊 -> 新)
  lineData.sort((a, b) => a.rawDate - b.rawDate);

  return (
    <Box p={4} bg={bg} borderRadius="xl" boxShadow="md" mb={6}>
      <Tabs variant='soft-rounded' colorScheme='teal' isFitted>
        <TabList mb={4}>
          <Tab>圓餅圖 (分佈)</Tab>
          <Tab>折線圖 (趨勢)</Tab>
        </TabList>

        <TabPanels>
          {/* 1. 圓餅圖面板 */}
          <TabPanel height="300px">
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </TabPanel>

          {/* 2. 折線圖面板 */}
          <TabPanel height="300px">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="每日花費"
                    stroke="#319795" 
                    strokeWidth={3}
                    activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default StatisticsChart;
