# start 3 brokers

node test/stress/broker.js --seq 1
node test/stress/broker.js --seq 2
node test/stress/broker.js --seq 3

# start some brokered to
node test/stress/instance-1.js --seq 4
node test/stress/instance-1.js --seq 5
