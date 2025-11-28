<VStack id="record-list" w="100%" spacing={3} align="stretch" bg="gray.50" p={2}>
            {records.slice(0, 50).map((record) => (
                <Card key={record._id} bg="white" shadow="sm" borderRadius="lg" overflow="hidden" borderLeft="4px solid" borderColor={(record.type === 'income') ? "green.400" : "red.400"}>
                    <CardBody py={3} px={4}>
                        <HStack justify="space-between">
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold">{record.item}</Text>
                                <HStack>
                                  {/* ✨ 加上 data-html2canvas-ignore="true" 強制隱藏 */}
                                  <Badge 
                                    className="pdf-hide" 
                                    data-html2canvas-ignore="true" 
                                    colorScheme={(record.type === 'income') ? "green" : "red"}
                                  >
                                    {(record.type === 'income') ? "收" : "支"}
                                  </Badge>
                                  
                                  <Badge 
                                    className="pdf-hide" 
                                    data-html2canvas-ignore="true"
                                    colorScheme="purple" 
                                    variant="outline"
                                  >
                                    {record.category}
                                  </Badge>

                                  {/* ✨ 載具也要加上這個屬性 */}
                                  {record.mobileBarcode && (
                                      <Badge 
                                        className="pdf-hide" 
                                        data-html2canvas-ignore="true"
                                        colorScheme="gray" 
                                        variant="solid"
                                      >
                                        📱 {record.mobileBarcode}
                                      </Badge>
                                  )}
                                </HStack>
                                <Text fontSize="xs" color="gray.400">{new Date(record.date).toLocaleDateString()}</Text>
                            </VStack>
                            <HStack>
                                <Text fontWeight="bold" color={(record.type === 'income') ? "green.500" : "red.500"}>
                                    {(record.type === 'income') ? "+ " : "- "} ${record.cost}
                                </Text>
                                {/* ✨ 垃圾桶也要加 */}
                                <IconButton 
                                  className="pdf-hide" 
                                  data-html2canvas-ignore="true"
                                  icon={<DeleteIcon />} 
                                  size="sm" 
                                  colorScheme="gray" 
                                  variant="ghost" 
                                  onClick={() => handleDelete(record._id)}
                                />
                            </HStack>
                        </HStack>
                    </CardBody>
                </Card>
            ))}
        </VStack>
        