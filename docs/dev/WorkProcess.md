# Cách làm việc

## Overview

Note lại quá trình làm dự án này.

## Giai đoạn định hình

* Viết UserRequirement.md, yêu cầu AI đọc và cho ý kiến (nhất là về tính khả thi của "Cách thức thực hiện").
* Sau khi AI đánh giá rằng giải pháp này là có ích (không có sẵn trên thị trường), và khả thi về mặt kỹ thuật, thì yêu cầu AI viết SystemRequirement.
* AI viết SystemRequirement quá kỹ lưỡng, tôi cho nó đánh giá là cái này bao gồm cả BasicDessign rồi.
  AI cũng đồng ý như vậy, nên tôi yêu cầu nó viết tách ra thành SystemRequirement.md và BasicDesign.md.

## Giai đoạn basic design

* Hỏi AI về cấu trúc thư mục code.
  > **Prompt**: Giờ chúng ta hãy bàn luận về cấu trúc source code.
  Có thể để chung cả LocalApp và ChromeExtension vào thư mục /src không (nhất là định tái sử dụng code). Nếu để chung thì nên phân chia thư mục thế nào? Có vẻ như ta sẽ còn cần build (localapp), đóng gói (extension) cho nên hãy lưu ý đến cả các thư mục output đó.

  AI cho tôi 2 giải pháp là "Monorepo với shared core" và "Separate repos với shared package". Tôi chọn giải pháp "monorepo".
* AI đưa ra giải pháp chi tiết về cấu trúc thư mục, cách build code... Tôi đề nghị đưa vào tài liệu ArchitectureDesign.md, và đề nghị viết cả file README.md trong SystemDesign.
* Tiếp tục thảo luận với AI về cấu trúc thư mục, và khả năng xây dựng GUI cho localapp sau này. Chốt là trước mắt **không cần quan tâm đến GUI**.
* Thảo luận về giải pháp lưu trữ data, kết luận là hybrid approach: Lưu message ở local nhưng cho phép refresh.
* Review và thảo luận chi tiết về cấu trúc database để phù hợp với nhu cầu. Cái này cần review khá kỹ, vì với dự án này, tôi quyết định không tự thiết kế DB mà giao cho AI. Tôi yêu cầu AI ghi chú rõ column nào là của Chatwork, và xem xét các column còn lại cũng như mục đích sử dụng của chúng.
* Review lại basic design, chỉnh sửa CLI syntax (do AI đã đề xuất), và bổ sung thêm các tính năng/scenario trước khi bắt tay vào code.
* Git commit.

## Giai đoạn code

* Nhờ AI tạo luôn chương trình CLI.
  * Hỏi AI là có nên tiếp tục trong cửa sổ chat này (khi context usage là 82.5%), AI trả lời là hãy tiếp tục.
  > **Prompt**: Tôi nghĩ là mọi thứ của chúng ta đã rất sẵn sàng và chi tiết. Nếu tôi nhờ bạn tạo code cho chương trình CLI hoàn thiện như những gì chúng ta đã đặt ra, thì yêu cầu đó có quá lớn không? Tôi cần phải yêu cầu từng bước nhỏ, hay chỉ cần yêu cầu bạn tạo ra chương trình CLI hoàn thiện theo spec đã đặt ra?

  * AI đề xuất là [làm từng bước](WorkProcessSample/RequestCreateAllCode.md) <= Đây là một đặc điểm chứng tỏ con AI này không phải là Claude-4-Sonnet.
* Yêu cầu AI thực hiện bước project setup (lẽ ra nên Git commit).
* Một lần nữa, đặt câu hỏi về [nơi đặt các configure file](WorkProcessSample/PlaceOfConfigureFile.md).
* Yêu cầu AI implement ChatworkAPI (lẽ ra nên Git commit).
* Yêu cầu AI implement DatabaseManager.
* Yêu cầu AI implement ThreadAnalyzer.
* Yêu cầu AI implement CLI.
* AI bị mắc lỗi liên tục, có khả năng không giải quyết được, nên tôi xóa toàn bộ code, chọn model Claude-4-Sonnet, và yêu cầu nó code lại từ đầu.
  > **Prompt**: Vì chúng ta bị tắc nghẽn, cho nên tôi quyết định code lại từ đầu.
  Trước đây, tôi sử dụng CursorIDE ở chế độ Auto Agent, nên không biết model nào đã giải quyết việc code. Code cũ đó, để trong thư mục chatwork-thread-autoagent (nếu bạn cần tham khảo).
  Tôi đã clear all code trong thư mục chatwork-thread (đây là thư mục làm việc chính của chúng ta).
  Hãy bắt đầu công việc lại từ đầu (hãy tham khảo tài liệu trong thư mục docs/SystemDesign).
  Và bắt đầu với việc project setup (tạo các file package.json...).

  AI (Claude-4-Sonnet) code luôn toàn bộ hệ thống (chứ không đòi hỏi phải làm từng bước một như trước nữa). AHA, tôi đã nhận ra, đây là phong cách của Claude-4-Sonnet, trước đây, nó luôn cố gắng thực hiện bất kỳ yêu cầu nào của tôi, cho dù to đến đâu, mà không than thở và đòi tách nhỏ ra gì hết.
  Kết quả là nó đã code xong một lèo, tự test, sửa lỗi và cuối cùng đã chạy được.

## Giai đoạn test và sửa lỗi

* Sau đó là quá trình test và sửa lỗi. Tạo sẵn các data test cho các case để trong file TestData.md cho AI tự tìm hiểu.
* Gặp lỗi thì cũng sửa mệt mỏi (dù đây chỉ là hệ thống nhỏ). Có lỗi logic (do dùng sai lệnh SQL) và chỉnh sửa giao diện output html.
* Và hôm nay [kết thúc tốt đẹp](WorkProcessSample/Thanks.md) với một tool hoàn thiện có thể sử dụng.

## Exension và GUI

* Vì chưa buồn ngủ, nên mặc dù đã gần sáng, lại kêu con AI code luôn phần Chrome Extension. Nó "tự tiện" code phần giao diện, khá nhanh. Sau đó thì tôi yêu cầu nó sửa lại giao diện theo ý mình.
* Trong quá trình làm việc, tôi phát hiện ra các hạn chế của Extension và thấy rằng nó không đáp ứng yêu cầu như mình mong muốn. Những gì nó có thể làm giống như local app mà thôi, nhưng lại bị hạn chế về mặt kỹ thuật do là extension. Thế là quyết định đóng máy, đi ngủ.
* Hôm sau, hỏi nó rằng cái Extension này thật vô dụng, thà rằng làm một chương trình gui, vừa  giống thế, vừa dễ làm hơn. Nó đồng ý, và code cái roẹt.