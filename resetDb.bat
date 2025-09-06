@echo off
REM Xóa file db
rm data/chatwork-thread.db

REM Thread 1
node dist/cli/chatwork-thread.js create "https://www.chatwork.com/#!rid409502735-2016140743370084352" --name "Test Thread 1" --description "Clean test"

REM Thread 2
node dist/cli/chatwork-thread.js create "https://www.chatwork.com/#!rid409502735-2016142483981078528" --name "Thread 2" --description "Middle of thread test"

REM Thread 3
node dist/cli/chatwork-thread.js create "https://www.chatwork.com/#!rid409502735-2016143216944091136" --name "スレッド 3" --description "Thread with additional independent messages"

node dist/cli/chatwork-thread.js add-message 3 "https://www.chatwork.com/#!rid409502735-2016143355800715264" --type manual

node dist/cli/chatwork-thread.js add-message 3 "https://www.chatwork.com/#!rid409502735-2016143486063218688" --type manual

REM Thread 4
node dist/cli/chatwork-thread.js create "https://www.chatwork.com/#!rid409502735-2016143988234649600" --name "Thread 4" --description "Multiple threads test - part 1"

REM Thread 5
node dist/cli/chatwork-thread.js create "https://www.chatwork.com/#!rid409502735-2016144360042926080" --name "スレッド 5" --description "Multiple threads test - part 2" --force-double

node dist/cli/chatwork-thread.js list
