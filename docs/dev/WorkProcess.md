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
* Tiếp tục thảo luận với AI về cấu trúc thư mục, và khả năng xây dựng GUI cho localapp sau này. Chốt là trước mắt không cần quan tâm đến GUI.
* Thảo luận về giải pháp lưu trữ data, kết luận là hybrid approach: Lưu message ở local nhưng cho phép refresh.
* Review và thảo luận chi tiết về cấu trúc database để phù hợp với nhu cầu. Cái này cần review khá kỹ, vì với dự án này, tôi quyết định không tự thiết kế DB mà giao cho AI. Tôi yêu cầu AI ghi chú rõ column nào là của Chatwork, và xem xét các column còn lại cũng như mục đích sử dụng của chúng.
* Review lại basic design, chỉnh sửa CLI syntax (do AI đã đề xuất), và bổ sung thêm các tính năng/scenario trước khi bắt tay vào code.
* Git commit.

## Giai đoạn code

* Nhờ AI tạo luôn chương trình CLI.
  * Hỏi AI là có nên tiếp tục trong cửa sổ chat này (khi context usage là 82.5%), AI trả lời là hãy tiếp tục.
  > **Prompt**: Tôi nghĩ là mọi thứ của chúng ta đã rất sẵn sàng và chi tiết. Nếu tôi nhờ bạn tạo code cho chương trình CLI hoàn thiện như những gì chúng ta đã đặt ra, thì yêu cầu đó có quá lớn không? Tôi cần phải yêu cầu từng bước nhỏ, hay chỉ cần yêu cầu bạn tạo ra chương trình CLI hoàn thiện theo spec đã đặt ra?

  * AI đề xuất là [làm từng bước](WorkProcessSample/RequestCreateAllCode.md).
* Yêu cầu AI thực hiện bước project setup (lẽ ra nên Git commit).
* Một lần nữa, đặt câu hỏi về [nơi đặt các configure file](WorkProcessSample/PlaceOfConfigureFile.md).
* Yêu cầu AI implement ChatworkAPI (lẽ ra nên Git commit).
* Yêu cầu AI implement DatabaseManager.
