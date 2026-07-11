import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 沪教牛津版（深圳常用）初中英语核心词表。
// 说明：
// 1. 单元标题按 Oxford English / 沪教牛津深圳版教材主题组织。
// 2. 词义为学习辅助释义，不复制教材课文原句。
// 3. 若后续拿到学校官方词表，可只替换这里的原始行，再重新生成 words.json。
const semesters = [
  {
    id: "grade-7-1",
    title: "七年级上册 · 沪教牛津版",
    units: [
      {
        name: "Unit 1 Making friends",
        words: `
German|adj./n.|德国的；德国人的；德语；德国人
grammar|n.|语法
sound|n./v.|声音；听起来
complete|v./adj.|完成；完整的
hobby|n.|爱好
country|n.|国家；乡下
age|n.|年龄
dream|n./v.|梦想；做梦
everyone|pron.|所有人；每个人
Germany|n.|德国
mountain|n.|山；山脉
elder|adj.|年长的
friendly|adj.|友好的
engineer|n.|工程师
world|n.|世界
Japan|n.|日本
flat|n./adj.|公寓；平的
yourself|pron.|你自己
blog|n.|博客
paragraph|n.|段落
close to|phr.|接近；离……近
go to school|phr.|去上学
be good at|phr.|擅长
make friends|phr.|交朋友
all over the world|phr.|全世界
would like to|phr.|想要
hear from|phr.|收到……的来信
        `,
      },
      {
        name: "Unit 2 Daily life",
        words: `
daily|adj.|每日的；日常的
article|n.|文章
never|adv.|从不
table tennis|n.|乒乓球
ride|v./n.|骑；乘坐；短途旅程
usually|adv.|通常
seldom|adv.|很少；不常
Geography|n.|地理
break|n./v.|休息；间歇；打破
bell|n.|铃；钟
ring|v.|发出铃声；打电话
end|v./n.|结束；末尾
band|n.|乐队
practice|n./v.|练习
together|adv.|在一起
market|n.|市场
guitar|n.|吉他
grade|n.|年级；等级
junior|adj.|初级的；年少的
rest|n./v.|休息
on foot|phr.|步行
take part in|phr.|参加
have a good time|phr.|玩得开心
morning break|n.|上午课间休息
junior high school|n.|初级中学
go to bed|phr.|上床睡觉
get up|phr.|起床
        `,
      },
      {
        name: "Unit 3 The Earth",
        words: `
Earth|n.|地球
quiz|n.|小测验；知识竞赛
pattern|n.|模式；图案
protect|v.|保护
report|n./v.|报告；报道
part|n.|部分
land|n.|陆地；土地
field|n.|田地；领域
large|adj.|大的
provide|v.|提供
pollution|n.|污染
burn|v.|燃烧；烧毁
energy|n.|能量；能源
pollute|v.|污染
ground|n.|地面
kill|v.|杀死；使停止
important|adj.|重要的
fact|n.|事实
few|det./adj.|不多；很少
problem|n.|问题
catch|v.|抓住；赶上
kilometre|n.|千米；公里
own|adj./v.|自己的；拥有
on Earth|phr.|在地球上；究竟
throw away|phr.|扔掉
stop doing|phr.|停止做某事
        `,
      },
      {
        name: "Unit 4 Seasons",
        words: `
season|n.|季节
Australia|n.|澳大利亚
wet|adj.|湿的；潮湿的
dry|adj.|干的；干燥的
snowy|adj.|下雪多的
spend|v.|花费；度过
relative|n.|亲戚
during|prep.|在……期间
grandparent|n.|祖父母；外祖父母
picnic|n.|野餐
shine|v.|照耀；发光
brightly|adv.|明亮地
trip|n.|旅行
everything|pron.|一切；所有事物
snowman|n.|雪人
kick|v.|踢
blow|v.|吹
temperature|n.|温度
festival|n.|节日
dumpling|n.|饺子
spring|n.|春天
summer|n.|夏天
autumn|n.|秋天
winter|n.|冬天
go on a picnic|phr.|去野餐
make snowmen|phr.|堆雪人
fly kites|phr.|放风筝
take a trip|phr.|去旅行
        `,
      },
      {
        name: "Unit 5 Visiting the Moon",
        words: `
diary|n.|日记
space|n.|太空；空间
spaceship|n.|宇宙飞船
spacesuit|n.|宇航服
nervous|adj.|紧张的
leave|v.|离开；留下
able|adj.|能够的
tie|v./n.|系；捆；领带
ourselves|pron.|我们自己
without|prep.|没有
breathe|v.|呼吸
if|conj.|如果；是否
camera|n.|照相机
work|v./n.|运转；工作；作品
garden|n.|花园
rock|n.|岩石
weak|adj.|虚弱的；无力的
float|v.|漂浮
return|v./n.|返回；归还
gravity|n.|重力
more than|phr.|多于；超过
be able to|phr.|能够
have to|phr.|不得不；必须
so that|phr.|以便；为了
take photos|phr.|拍照
as...as|phr.|和……一样
        `,
      },
      {
        name: "Unit 6 Travelling around Asia",
        words: `
Asia|n.|亚洲
guide|n./v.|导游；指南；指导
area|n.|地区；面积
traditional|adj.|传统的
modern|adj.|现代的
sightseeing|n.|观光；游览
centre|n.|中心
natural|adj.|自然的；天然的
beauty|n.|美；美人
bridge|n.|桥
pond|n.|池塘
snack|n.|小吃
outside|adv./prep.|在外面；在……外面
direction|n.|方向；指示
light|n./v.|灯；光；照亮
building|n.|建筑物
across|prep./adv.|穿过；在对面
temple|n.|寺庙
palace|n.|宫殿
square|n.|广场；正方形
travel guide|n.|旅行指南
place of interest|n.|名胜
walk along|phr.|沿着……走
light up|phr.|点亮；照亮
in the centre of|phr.|在……中心
        `,
      },
      {
        name: "Unit 7 School clubs",
        words: `
fair|n./adj.|展览会；公平的
rocket|n.|火箭
solar|adj.|太阳的
power|n.|能量；力量
attend|v.|参加；出席
teach|v.|教
launch|v./n.|发射；发动
disappear|v.|消失
surprised|adj.|惊讶的
another|det./pron.|又一；另一个
amazing|adj.|令人惊奇的
skill|n.|技能
boring|adj.|令人厌烦的
information|n.|信息
ant|n.|蚂蚁
butterfly|n.|蝴蝶
bee|n.|蜜蜂
headline|n.|标题
photography|n.|摄影
recent|adj.|最近的
experiment|n.|实验
learn about|phr.|了解；学习
all the way|phr.|一路上；自始至终
of course|phr.|当然
solar power|n.|太阳能
        `,
      },
      {
        name: "Unit 8 Collecting things",
        words: `
collection|n.|收藏品；收集
collector|n.|收藏家
unusual|adj.|与众不同的；不寻常的
interview|n./v.|采访；面试
model|n.|模型；模特
stamp|n.|邮票
doorbell|n.|门铃
silver|adj./n.|银色的；银
push|v.|推
soon|adv.|不久
grandson|n.|孙子；外孙
granddaughter|n.|孙女；外孙女
inside|adv./prep.|在里面；在……里面
everywhere|adv.|到处
follow|v.|跟随；遵循
hardly|adv.|几乎不
free|adj.|空闲的；免费的
front|n./adj.|前面；前部的
newspaper|n.|报纸
something|pron.|某事；某物
living room|n.|客厅
be interested in|phr.|对……感兴趣
be bad for|phr.|对……有害
work of art|n.|艺术品
look for|phr.|寻找
        `,
      },
    ],
  },
  {
    id: "grade-7-2",
    title: "七年级下册 · 沪教牛津版",
    units: [
      {
        name: "Unit 1 People around us",
        words: `
cheerful|adj.|快乐的；高兴的
hard-working|adj.|勤勉的；努力工作的
patient|adj./n.|耐心的；病人
smart|adj.|聪明的；机敏的
probably|adv.|很可能
forget|v.|忘记
smell|n./v.|气味；闻起来
care|n./v.|照顾；关心
miss|v.|想念；错过
joke|n./v.|玩笑；开玩笑
laugh|v.|笑
remain|v.|仍然是；保持不变
strict|adj.|严格的
encourage|v.|鼓励
support|v./n.|支持
successful|adj.|成功的
member|n.|成员
person|n.|人
paragraph|n.|段落
grandmother|n.|祖母；外祖母
give up|phr.|放弃
take care of|phr.|照顾
tell jokes|phr.|讲笑话
make fun of|phr.|取笑
be strict about|phr.|对……要求严格
as well|phr.|也
        `,
      },
      {
        name: "Unit 2 Travelling around the world",
        words: `
France|n.|法国
French|adj./n.|法国的；法语；法国人
flag|n.|旗帜
Europe|n.|欧洲
possible|adj.|可能的
store|n.|商店
wine|n.|葡萄酒
excellent|adj.|优秀的；极好的
south|n./adj./adv.|南部；南方的；向南
lie|v.|位于；躺；说谎
coast|n.|海岸
perfect|adj.|完美的
ski|v./n.|滑雪
tower|n.|塔
finish|v./n.|完成；结束
lift|n./v.|电梯；举起
step|n./v.|台阶；迈步
vineyard|n.|葡萄园
capital|n.|首都；大写字母
department store|n.|百货商店
place of interest|n.|名胜
go sightseeing|phr.|去观光
be famous for|phr.|因……而著名
prefer to|phr.|更喜欢
try doing|phr.|尝试做某事
        `,
      },
      {
        name: "Unit 3 Our animal friends",
        words: `
blind|adj.|失明的；盲的
helpful|adj.|有帮助的
rescue|v./n.|营救；救援
mean|v./adj.|意思是；吝啬的
receptionist|n.|接待员
allow|v.|允许
pet|n.|宠物
anywhere|adv.|任何地方
apologize|v.|道歉
lead|v.|带领；引导
bark|v./n.|犬吠；树皮
wake|v.|醒来；唤醒
towel|n.|毛巾
bottom|n.|底部
finally|adv.|最后；终于
airport|n.|机场
appear|v.|出现
act|v./n.|行动；表演
radio|n.|收音机；无线电
guide dog|n.|导盲犬
by oneself|phr.|独自
arrive at|phr.|到达
fall asleep|phr.|入睡
wake up|phr.|醒来；叫醒
fire engine|n.|消防车
        `,
      },
      {
        name: "Unit 4 Save the trees",
        words: `
pine|n.|松树
discuss|v.|讨论
branch|n.|树枝；分支
root|n.|根；根源
fight|v./n.|与……作斗争；打架
against|prep.|反对；倚靠
example|n.|例子
harmful|adj.|有害的
gas|n.|气体；煤气
produce|v.|产生；生产
oxygen|n.|氧气
major|adj.|主要的；重大的
convenient|adj.|方便的
furniture|n.|家具
imagine|v.|想象
disease|n.|疾病
dig|v.|挖
hole|n.|洞；孔
carry|v.|携带；搬运
save|v.|拯救；节省
take in|phr.|吸收
come from|phr.|来自
for example|phr.|例如
in fact|phr.|事实上
look around|phr.|环顾
cut down|phr.|砍倒；削减
        `,
      },
      {
        name: "Unit 5 Water",
        words: `
drop|n./v.|滴；落下
journey|n.|旅行；旅程
quantity|n.|数量
experiment|n.|实验
fresh|adj.|淡的；新鲜的
salt|n.|盐
voice|n.|嗓音；声音
add|v.|增加；添加
chemical|n./adj.|化学品；化学的
through|prep.|通过；穿过
pipe|n.|管道
valuable|adj.|宝贵的；有价值的
bit|n.|一点；小块
bank|n.|银行；河岸
change|v./n.|改变；变化
form|n./v.|形式；形成
continue|v.|继续
return|v./n.|返回；归还
vapour|n.|蒸汽
freeze|v.|结冰；冻结
turn off|phr.|关掉
add to|phr.|增加；添加到
a bit|phr.|有点；一点
part of|phr.|……的一部分
pocket money|n.|零花钱
        `,
      },
      {
        name: "Unit 6 Electricity",
        words: `
electricity|n.|电
conversation|n.|谈话
identify|v.|确认；识别
rule|n.|规则
anyone|pron.|任何人
reply|v./n.|回答；答复
foolish|adj.|愚蠢的
wire|n.|电线
connect|v.|连接
cable|n.|电缆
moment|n.|片刻；瞬间
battery|n.|电池
cooker|n.|厨灶；炊具
fridge|n.|冰箱
bulb|n.|电灯泡
lock|v./n.|锁上；锁
test|v./n.|测试；测验
switch|n./v.|开关；转换
tidy|adj./v.|整洁的；整理
touch|v.|触摸；碰
be connected to|phr.|连接到
power station|n.|发电站
washing machine|n.|洗衣机
switch off|phr.|关掉
make sure|phr.|确保
        `,
      },
      {
        name: "Unit 7 Poems",
        words: `
poem|n.|诗
ordinary|adj.|普通的；平凡的
feeling|n.|感觉；情感
order|n./v.|顺序；命令；点餐
advice|n.|建议
aloud|adv.|大声地
group|n.|组；群
agree|v.|同意
disagree|v.|不同意
rhyme|n./v.|押韵；押韵词
well|n./adv.|井；好
shower|n.|淋浴；阵雨
narrow|adj.|狭窄的
height|n.|高度
seller|n.|卖者；销售者
smile|v./n.|微笑
crowd|n.|人群
hurry|v./n.|匆忙
complete|v./adj.|完成；完整的
at all|phr.|根本；到底
newspaper stand|n.|报摊
rush out|phr.|冲出去
a crowd of|phr.|一群
high up|phr.|在高处
        `,
      },
      {
        name: "Unit 8 From hobby to career",
        words: `
career|n.|事业；职业
planet|n.|行星
satellite|n.|卫星
diamond|n.|钻石
shoot|v.|射击；冲；拍摄
host|n./v.|主持人；主办
knowledge|n.|知识
lively|adj.|生动的；活泼的
last|v./adj.|持续；最后的
actually|adv.|事实上
achieve|v.|实现；达到
decide|v.|决定
train|v./n.|训练；火车
alone|adj./adv.|独自；单独的
sail|v.|航行
hobby|n.|爱好
future|n./adj.|未来；将来的
company|n.|公司；陪伴
programme|n.|节目；程序
star|n.|星星；明星
decide on|phr.|选定；决定
turn into|phr.|变成
grow up|phr.|长大
go outside|phr.|到外面去
look like|phr.|看起来像
        `,
      },
    ],
  },
  {
    id: "grade-8-1",
    title: "八年级上册 · 沪教牛津版",
    units: [
      {
        name: "Unit 1 Encyclopaedias",
        words: `
encyclopaedia|n.|百科全书
human|n./adj.|人；人的
dinosaur|n.|恐龙
Italian|adj./n.|意大利的；意大利人；意大利语
inventor|n.|发明家
musician|n.|音乐家
scientist|n.|科学家
born|v./adj.|出生；天生的
countryside|n.|乡村；农村
intelligence|n.|才智；智慧
ability|n.|能力
include|v.|包括；包含
however|adv.|然而
perhaps|adv.|可能；也许
invention|n.|发明
notebook|n.|笔记本
even|adv.|甚至
suddenly|adv.|突然
nobody|pron.|没有人
fossil|n.|化石
create|v.|创造
die out|phr.|灭绝
as...as|phr.|和……一样
more than|phr.|多于；超过
find out|phr.|查明
        `,
      },
      {
        name: "Unit 2 Numbers",
        words: `
number|n.|数字；号码
instruction|n.|指示；用法说明
check|v./n.|检查；核对
gram|n.|克
son|n.|儿子
chess|n.|国际象棋
wise|adj.|充满智慧的
challenge|v./n.|向……挑战；挑战
promise|v./n.|许诺；承诺
prize|n.|奖赏；奖品
grain|n.|谷粒；颗粒
double|v./adj.|加倍；两倍的
amount|n.|数量；总额
rest|n./v.|剩余部分；休息
instead|adv.|代替；反而
realize|v.|认识到；实现
copy|v./n.|抄写；副本
correctly|adv.|正确地
traffic|n.|交通
accident|n.|事故
count|v.|数；计算
follow|v.|遵循；跟随
so that|phr.|以便；结果
copy down|phr.|抄下；记下
one day|phr.|有一天
        `,
      },
      {
        name: "Unit 3 Computers",
        words: `
computer|n.|电脑；计算机
order|n./v.|命令；顺序；订购
monitor|n.|显示器；班长；监控器
speaker|n.|扬声器；说话者
keyboard|n.|键盘
mouse|n.|鼠标；老鼠
type|v./n.|打字；类型
brain|n.|大脑
control|v./n.|控制
expensive|adj.|昂贵的
tiny|adj.|极小的
depend|v.|依靠；取决于
calculate|v.|计算
speed|n.|速度
operate|v.|操作；运转
railway|n.|铁路
company|n.|公司
total|n./adj.|总数；总的
unaware|adj.|未察觉的
popular|adj.|受欢迎的
sell|v.|出售
compare|v.|比较
main unit|n.|主机
work as|phr.|担任；从事
depend on|phr.|依赖；取决于
in addition|phr.|此外
grand total|n.|总计
        `,
      },
      {
        name: "Unit 4 Inventions",
        words: `
invention|n.|发明
advertisement|n.|广告
funny|adj.|滑稽的；有趣的
create|v.|创造
telephone|n.|电话
wheel|n.|轮子
comfortable|adj.|舒服的
carriage|n.|四轮马车；车厢
century|n.|世纪
passenger|n.|乘客
invent|v.|发明
practical|adj.|实用的
since|prep./conj.|自从；因为
distance|n.|距离
candle|n.|蜡烛
anytime|adv.|在任何时候
develop|v.|发展；研制
special|adj.|特别的
wing|n.|翅膀
petrol|n.|汽油
mobile phone|n.|手机
be used for|phr.|被用来
keep in touch with|phr.|与……保持联系
instead of|phr.|代替；而不是
at the same time|phr.|同时
        `,
      },
      {
        name: "Unit 5 Educational exchanges",
        words: `
exchange|n./v.|交流；交换
educational|adj.|教育的；有教育意义的
culture|n.|文化
host|n./v.|主人；主办
local|adj.|当地的
British|adj./n.|英国的；英国人
glad|adj.|高兴的
guest|n.|客人
chopstick|n.|筷子
weekday|n.|工作日
tour|n./v.|旅行；参观
fantastic|adj.|极好的
experience|n./v.|经历；体验
already|adv.|已经
introduce|v.|介绍
success|n.|成功
yet|adv.|还；已经
respect|v./n.|尊重
friendship|n.|友谊
activity|n.|活动
learn about|phr.|了解
at first|phr.|起初
so far|phr.|到目前为止
keep in touch with|phr.|与……保持联系
        `,
      },
      {
        name: "Unit 6 Ancient stories",
        words: `
ancient|adj.|古代的
war|n.|战争
captain|n.|首领；船长；队长
soldier|n.|士兵
huge|adj.|巨大的
pull|v.|拉
main|adj.|主要的
celebrate|v.|庆祝
stupid|adj.|愚蠢的
midnight|n.|午夜
empty|adj./v.|空的；倒空
except|prep.|除……之外
secret|n./adj.|秘密；秘密的
side|n.|一边；一侧
quietly|adv.|安静地；悄悄地
army|n.|军队
enter|v.|进入
succeed|v.|成功
trick|n./v.|计谋；欺骗
Greek|adj./n.|希腊的；希腊人
Trojan|adj./n.|特洛伊的；特洛伊人
give up|phr.|放弃
sail away|phr.|驾船离开
by midnight|phr.|到午夜之前
in the end|phr.|最后
        `,
      },
      {
        name: "Unit 7 Memory",
        words: `
memory|n.|记忆力；记忆
corner|n.|角落
lose|v.|丢失；输掉
improve|v.|改善；提高
mention|v.|提到
method|n.|方法
silly|adj.|愚蠢的
worth|adj.|值得的
spell|v.|拼写
unless|conj.|除非
trouble|n.|困难；麻烦
list|n./v.|清单；列清单
step|n.|步骤；脚步
cycle|n.|循环；自行车
similar|adj.|相似的
wallet|n.|钱包
note|n./v.|笔记；注意到
manager|n.|经理
mile|n.|英里
memorize|v.|记住
take out|phr.|取出
pour out|phr.|涌出；倾倒
in the corner|phr.|在角落里
make a list|phr.|列清单
between...and|phr.|在……和……之间
        `,
      },
      {
        name: "Unit 8 English Week",
        words: `
speech|n.|演讲；发言
notice|n./v.|通知；注意到
competition|n.|比赛；竞赛
treasure|n.|宝藏
text|n.|文本；课文
chance|n.|机会
confidently|adv.|自信地
topic|n.|话题
winner|n.|获胜者
advise|v.|建议
several|det./pron.|几个；数个
opinion|n.|意见；看法
whole|adj.|整个的
suggestion|n.|建议
communicate|v.|交流；沟通
shy|adj.|害羞的
rich|adj.|富有的；丰富的
poor|adj.|贫穷的；可怜的
hide|v.|隐藏
attack|v./n.|攻击
in public|phr.|公开地；当众
put on|phr.|上演；穿上
above all|phr.|最重要的是
take part in|phr.|参加
look out|phr.|当心；向外看
        `,
      },
    ],
  },
  {
    id: "grade-8-2",
    title: "八年级下册 · 沪教牛津版",
    units: [
      {
        name: "Unit 1 Helping those in need",
        words: `
raise|v.|筹募；提升；养育
disabled|adj.|有残疾的
teenager|n.|青少年
offer|v./n.|主动提出；提供
suffer|v.|受苦；遭受
serious|adj.|严重的；认真的
illness|n.|疾病
organize|v.|组织
express|v.|表达
pain|n.|痛苦；疼痛
lonely|adj.|孤独的
friendship|n.|友谊
difficulty|n.|困难
joy|n.|愉快；喜悦
peace|n.|平静；和平
hurt|v./adj.|伤害；受伤的
courage|n.|勇气
spirit|n.|精神；勇气
pay|v./n.|支付；薪水
community|n.|社区
in need|phr.|在困难中；需要帮助
voluntary work|n.|志愿工作
suffer from|phr.|受……折磨
raise one's spirits|phr.|使振奋
in order to|phr.|为了
        `,
      },
      {
        name: "Unit 2 Body language",
        words: `
language|n.|语言
communication|n.|交流；沟通
ballet|n.|芭蕾舞
accept|v.|接受
reject|v.|拒绝
meaning|n.|意思；含义
gesture|n.|手势
message|n.|信息；消息
bored|adj.|厌倦的
part-time|adj./adv.|兼职的；兼职地
well-dressed|adj.|穿着讲究的
lady|n.|女士
sigh|v./n.|叹气
matter|n./v.|事情；要紧
expression|n.|表情；表达
appearance|n.|外貌；出现
impression|n.|印象
remind|v.|提醒
neck|n.|脖子
nod|v./n.|点头
shake|v.|摇动；握手
body language|n.|肢体语言
take place|phr.|发生
sit up|phr.|坐直
make a good impression|phr.|留下好印象
remind sb. about|phr.|提醒某人某事
        `,
      },
      {
        name: "Unit 3 Traditional skills",
        words: `
description|n.|描述
fisherman|n.|渔民
net|n.|网
although|conj.|虽然；尽管
fit|adj./v.|健康的；合适；适合
dive|v.|潜水
ready|adj.|准备好的
reach|v.|到达；伸手够到
attract|v.|吸引
hang|v.|悬挂
post|n./v.|柱；邮寄；发布
require|v.|需要；要求
practice|v./n.|练习
scissors|n.|剪刀
tool|n.|工具
pattern|n.|图案；模式
character|n.|文字；人物；性格
health|n.|健康
luck|n.|运气
cormorant|n.|鸬鹚
paper cutting|n.|剪纸
set off|phr.|出发；使爆炸
up to|phr.|达到；多达
after dark|phr.|天黑后
no more|phr.|不再
        `,
      },
      {
        name: "Unit 4 Cartoons and comic strips",
        words: `
cartoon|n.|卡通片；漫画
warning|n.|警告
role-play|n./v.|角色扮演
symbol|n.|符号；象征
thought|n.|思想；想法
rough|adj.|粗略的；粗糙的
sketch|n./v.|速写；草图
program|n./v.|程序；节目；编程
record|v./n.|录制；记录
basic|adj.|基本的
stage|n.|舞台；阶段
pleasant|adj.|令人愉快的
detailed|adj.|详细的
appear|v.|出现
actor|n.|演员
separately|adv.|单独地；分别地
play|n./v.|剧本；播放；玩
score|n./v.|得分；分数
team|n.|团队
speech bubble|n.|对话气泡
comic strip|n.|连环漫画
pop out|phr.|突然出现
decide on|phr.|选定；决定
video camera|n.|摄像机
make it|phr.|成功做到
        `,
      },
      {
        name: "Unit 5 Save the endangered animals",
        words: `
endangered|adj.|濒危的
file|n.|档案；文件
giant panda|n.|大熊猫
wild|adj./n.|野生的；自然环境
bamboo|n.|竹子
adult|n./adj.|成年动物；成年的
weight|n.|重量
kilogram|n.|千克
population|n.|数量；人口
behaviour|n.|行为
birth|n.|出生
patch|n.|色斑；小块
shoulder|n.|肩膀
central|adj.|中心的；中央的
menu|n.|菜单
fur|n.|毛皮
cruel|adj.|残忍的
organization|n.|组织
face|v./n.|面对；脸
danger|n.|危险
in the wild|phr.|在野外
at birth|phr.|出生时
close to|phr.|接近；靠近
on one's own|phr.|独自
stay healthy|phr.|保持健康
        `,
      },
      {
        name: "Unit 6 Pets",
        words: `
pet|n.|宠物
sofa|n.|沙发
noisy|adj.|吵闹的
nearly|adv.|几乎；差不多
stranger|n.|陌生人
common|adj.|常见的；共同的
choice|n.|选择
lie|v.|躺；说谎
attention|n.|注意；关注
cause|v./n.|导致；原因
according|adv.|按照；根据
cute|adj.|可爱的
responsibility|n.|责任
feed|v.|喂养
believe|v.|相信
heart|n.|心；心脏
faithful|adj.|忠诚的
die|v.|死
care|n./v.|照顾；关心
train|v./n.|训练；火车
keep a pet|phr.|养宠物
have no choice but to|phr.|别无选择只能
run free|phr.|自由奔跑
lie around|phr.|无所事事地躺着
according to|phr.|根据
        `,
      },
      {
        name: "Unit 7 The unknown world",
        words: `
unknown|adj./n.|未知的；未知事物
astronaut|n.|宇航员
receive|v.|收到
hill|n.|小山
loud|adj.|响亮的
bush|n.|灌木
quiet|adj.|安静的
round|adj./adv.|圆的；围绕
damage|v./n.|破坏；损害
crash|v./n.|坠毁；碰撞
frightened|adj.|害怕的
discover|v.|发现
terrible|adj.|可怕的；糟糕的
fear|n./v.|害怕；恐惧
creature|n.|生物
feather|n.|羽毛
wonder|v./n.|想知道；奇迹
line|n.|线；排
refuse|v.|拒绝
spread|v.|展开；传播
keep quiet|phr.|保持安静
because of|phr.|因为
in fear|phr.|害怕地
landing site|n.|着陆地点
run away|phr.|逃跑
        `,
      },
      {
        name: "Unit 8 Life in the future",
        words: `
Internet|n.|互联网
post|v./n.|邮寄；发布；帖子
present|n./adj.|现在；礼物；出席的
hydrogen|n.|氢
wide|adj.|宽的
shape|n./v.|形状；塑造
cafe|n.|咖啡馆
recently|adv.|最近
forever|adv.|永远
certainly|adv.|当然；肯定
recommend|v.|推荐
satisfy|v.|使满意
mix|v./n.|混合
electronic|adj.|电子的
relax|v.|放松
while|conj./n.|当……时；一会儿
technology|n.|科技；技术
medicine|n.|药；医学
advantage|n.|优点
disadvantage|n.|缺点
in the present|phr.|现在
at the front|phr.|在前面
in a second|phr.|马上；片刻后
prepare for|phr.|为……做准备
fail to|phr.|未能做成
        `,
      },
    ],
  },
  {
    id: "grade-9-1",
    title: "九年级上册 · 沪教牛津版",
    units: [
      {
        name: "Unit 1 Wise men in history",
        words: `
golden|adj.|金色的；金制的
crown|n.|王冠
Olympics|n.|奥运会
agreement|n.|同意；协议
confirmation|n.|证实；确认
pot|n.|罐；壶
doubt|n./v.|怀疑
real|adj.|真的；真实的
truth|n.|真相；事实
seem|v.|似乎；好像
solve|v.|解决
fill|v.|装满；填满
bowl|n.|碗
displace|v.|取代；排开
metal|n.|金属
less|det./pron.|较少；更少
certain|adj.|确信的；某个
prison|n.|监狱
hit|v./n.|击；打
brave|adj.|勇敢的
be happy with|phr.|对……满意
fill with|phr.|用……装满
run over|phr.|溢出；碾过
send to prison|phr.|把……送进监狱
        `,
      },
      {
        name: "Unit 2 Great minds",
        words: `
mind|n./v.|头脑；介意
genius|n.|天才
consider|v.|认为；考虑
sense|n.|感觉；判断力
humour|n.|幽默
invitation|n.|邀请
pleasure|n.|乐事；高兴
avoid|v.|避免
lecture|n.|讲座
tonight|adv./n.|今晚
audience|n.|观众；听众
pale|adj.|苍白的
achievement|n.|成就
universe|n.|宇宙
philosopher|n.|哲学家
theory|n.|理论
reduce|v.|减少
exactly|adv.|确切地
gift|n.|礼物；天赋
obey|v.|服从
let...down|phr.|使……失望
take a seat|phr.|坐下
join in|phr.|参加
have no idea|phr.|不知道
        `,
      },
      {
        name: "Unit 3 Family life",
        words: `
meal|n.|一餐；膳食
share|v.|分享；共用
decision|n.|决定
expect|v.|期望；预计
abroad|adv.|在国外；到国外
business|n.|商业；事务
personal|adj.|个人的；私人的
set|v./n.|安排；套；组
daughter|n.|女儿
relationship|n.|关系
possession|n.|财产；拥有
suppose|v.|认为；假定
mind|v./n.|介意；头脑
invite|v.|邀请
cost|v./n.|花费；费用
type|n./v.|类型；打字
fashionable|adj.|时髦的
out of date|phr.|过时的
iron|v./n.|熨；铁
event|n.|事件；活动
family meeting|n.|家庭会议
go abroad|phr.|出国
make a decision|phr.|作决定
on business|phr.|出差
be expected to|phr.|被期望做
        `,
      },
      {
        name: "Unit 4 Problems and advice",
        words: `
online|adj./adv.|在线的；在线地
model|n.|模特；模型
diet|n.|饮食；日常食物
though|conj./adv.|虽然；不过
regret|v./n.|后悔；遗憾
ashamed|adj.|惭愧的
situation|n.|情况；形势
advantage|n.|优势；优点
embarrassed|adj.|尴尬的
suggest|v.|建议
mad|adj.|生气的；疯狂的
mess|n.|杂乱；困境
annoying|adj.|使恼怒的
fail|v.|失败；未能
careless|adj.|粗心的
comment|n./v.|评论
none|pron.|没有一个
exam|n.|考试
habit|n.|习惯
deal|v./n.|处理；协议
drive sb. mad|phr.|使某人发疯
make a mess|phr.|弄得一团糟
out of place|phr.|不合适；不在原处
be worried about|phr.|担心
ask for advice|phr.|征求建议
        `,
      },
      {
        name: "Unit 5 Action!",
        words: `
director|n.|导演；主管
make-up|n.|化妆
artist|n.|艺术家
studio|n.|演播室；工作室
scene|n.|场景；景色
script|n.|剧本
contestant|n.|参赛者
relaxed|adj.|放松的
ahead|adv.|向前；在前面
beat|v.|打败；敲打
still|adj./adv.|静止的；仍然
single|adj.|单个的；单身的
victory|n.|胜利
lucky|adj.|幸运的
news|n.|新闻
survey|n./v.|调查
among|prep.|在……之中
talent|n.|天赋；才艺
weekday|n.|工作日
camera|n.|照相机；摄像机
on weekdays|phr.|在工作日
pass out|phr.|昏倒；分发
keep still|phr.|保持不动
ahead of|phr.|领先于；在……前面
talent show|n.|才艺表演
        `,
      },
      {
        name: "Unit 6 Healthy diet",
        words: `
diet|n.|饮食
fat|n./adj.|脂肪；胖的
sugar|n.|糖
state|v./n.|说明；状态
necessary|adj.|必要的
research|n./v.|研究
plenty|pron./n.|大量
usual|adj.|通常的
coffee|n.|咖啡
treat|v./n.|招待；对待
customer|n.|顾客
medical|adj.|医疗的；医学的
service|n.|服务
pound|n.|磅；英镑
title|n.|标题；称号
balanced|adj.|均衡的
menu|n.|菜单
bean|n.|豆
product|n.|产品
prefer|v.|更喜欢
dairy|adj./n.|乳制品的；乳制品
fried|adj.|油炸的
soft drink|n.|软饮料
stay away from|phr.|远离
a balanced diet|n.|均衡饮食
        `,
      },
      {
        name: "Unit 7 The Adventures of Tom Sawyer",
        words: `
adventure|n.|冒险；奇遇
novel|n.|小说
frog|n.|青蛙
congratulation|n.|祝贺
sympathy|n.|同情
steam|n.|蒸汽
writer|n.|作家
humorous|adj.|幽默的
fence|n.|栅栏
task|n.|任务
board|n./v.|木板；上船
silence|n.|沉默
deal|n./v.|交易；处理
famous|adj.|著名的
paint|v./n.|油漆；绘画
pleasure|n.|乐事；愉快
yard|n.|院子；码
trick|n./v.|诡计；欺骗
treasure|n.|宝藏
be full of|phr.|充满
think of|phr.|想起；认为
come along|phr.|出现；一起来
go on|phr.|继续
in silence|phr.|沉默地
        `,
      },
      {
        name: "Unit 8 Surprise endings",
        words: `
gift|n.|礼物；天赋
graduation|n.|毕业
count|v.|数；重要
afford|v.|买得起；承担得起
present|n./adj.|礼物；现在；出席的
comb|n./v.|梳子；梳理
chain|n.|链子
bill|n.|账单；钞票
step|n./v.|脚步；台阶；迈步
search|v./n.|搜寻
draw|v.|掏出；画
set|n./v.|一套；安排
explain|v.|解释
proud|adj.|骄傲的；自豪的
note|n.|便条；笔记
possession|n.|财产；拥有
husband|n.|丈夫
wife|n.|妻子
tear|n./v.|眼泪；撕
watch chain|n.|表链
be proud of|phr.|为……自豪
look for|phr.|寻找
at last|phr.|最后
instead of|phr.|代替；而不是
sell out|phr.|卖光
        `,
      },
    ],
  },
  {
    id: "grade-9-2",
    title: "九年级下册 · 沪教牛津版",
    units: [
      {
        name: "Unit 1 Great explorations",
        words: `
voyage|n.|航行
exploration|n.|探索
explorer|n.|探险家
discovery|n.|发现
rise|v./n.|上升；增加
official|n./adj.|官员；官方的
relation|n.|关系；联系
trade|n./v.|贸易；交易
develop|v.|发展；培养
fleet|n.|舰队；船队
Africa|n.|非洲
silk|n.|丝绸
giraffe|n.|长颈鹿
besides|prep./adv.|除……之外；此外
development|n.|发展
region|n.|地区
pioneer|n.|先驱；先锋
route|n.|路线
foreign|adj.|外国的
journey|n.|旅程
open up|phr.|开辟；开放
go on a trip|phr.|去旅行
set up|phr.|建立；设立
lead to|phr.|导致；通向
        `,
      },
      {
        name: "Unit 2 Culture shock",
        words: `
culture|n.|文化
shock|n./v.|震惊；使震惊
camp|n.|营地
international|adj.|国际的
admit|v.|承认；准许进入
spare|adj./v.|空闲的；抽出
manage|v.|完成；管理
passport|n.|护照
host family|n.|寄宿家庭
custom|n.|风俗；习惯
stranger|n.|陌生人
exchange|n./v.|交流；交换
experience|n./v.|经历；体验
local|adj.|当地的
continue|v.|继续
education|n.|教育
weekday|n.|工作日
degree|n.|程度；学位
weather|n.|天气
homesick|adj.|想家的
keep in touch|phr.|保持联系
on time|phr.|准时
to a certain degree|phr.|在某种程度上
under the weather|phr.|身体不适
        `,
      },
      {
        name: "Unit 3 The environment",
        words: `
environment|n.|环境
greenhouse|n./adj.|温室；温室的
gas|n.|气体
fuel|n.|燃料
carbon dioxide|n.|二氧化碳
increase|v./n.|增加
temperature|n.|温度
flood|n./v.|洪水；淹没
surface|n.|表面
destroy|v.|破坏；毁灭
nature|n.|自然
proper|adj.|合适的；正确的
friendly|adj.|友好的
recycle|v.|回收利用
reusable|adj.|可重复使用的
plastic|n./adj.|塑料；塑料的
rubbish|n.|垃圾
pollution|n.|污染
waste|n./v.|废物；浪费
action|n.|行动
cut down|phr.|砍倒；削减
result in|phr.|导致
mountains of|phr.|大量的
take action|phr.|采取行动
environmentally friendly|adj.|环保的
        `,
      },
      {
        name: "Unit 4 Natural disasters",
        words: `
disaster|n.|灾难
earthquake|n.|地震
typhoon|n.|台风
flood|n./v.|洪水；淹没
drought|n.|干旱
alive|adj.|活着的
pool|n.|水池；池塘
object|n.|物体；目标
coach|n.|教练；长途汽车
pass|v./n.|经过；通过；传球
dead|adj.|死的
missing|adj.|失踪的
survivor|n.|幸存者
medical|adj.|医疗的
helicopter|n.|直升机
immediately|adv.|立即
damage|n./v.|损害；破坏
shelter|n.|避难所
warning|n.|警告
calm|adj./v.|镇静的；使平静
in danger|phr.|处于危险中
keep calm|phr.|保持冷静
pass by|phr.|经过
stick with|phr.|坚持；不离开
first aid|n.|急救
        `,
      },
      {
        name: "Unit 5 Sport",
        words: `
sport|n.|运动
skiing|n.|滑雪运动
volleyball|n.|排球
badminton|n.|羽毛球
boxing|n.|拳击
race|n./v.|比赛；竞赛
track|n.|跑道；轨道
beat|v.|打败；敲打
score|n./v.|得分；分数
exercise|n./v.|锻炼
event|n.|比赛项目；事件
stadium|n.|体育场
athlete|n.|运动员
champion|n.|冠军
final|n./adj.|决赛；最后的
medal|n.|奖牌
training|n.|训练
teammate|n.|队友
decision|n.|决定
fair|adj./n.|公平的；展览会
take part in|phr.|参加
go skiing|phr.|去滑雪
keep fit|phr.|保持健康
warm up|phr.|热身
set a record|phr.|创造纪录
        `,
      },
      {
        name: "Unit 6 Caring for your health",
        words: `
health|n.|健康
quarrel|n./v.|争吵
pressure|n.|压力
risk|n./v.|风险；冒险
guard|v./n.|保护；警卫
cancel|v.|取消；抵消
bright|adj.|明亮的；聪明的
force|v./n.|强迫；力量
whether|conj.|是否
private|adj.|私人的
silent|adj.|沉默的
enemy|n.|敌人
regular|adj.|有规律的；定期的
cheer|v./n.|欢呼；鼓励
low|adj.|低的；沮丧的
mood|n.|心情
relaxed|adj.|放松的
focus|v./n.|集中；焦点
breathe|v.|呼吸
lifestyle|n.|生活方式
deal with|phr.|处理；应对
guard against|phr.|防止；提防
cancel out|phr.|抵消
cheer up|phr.|振作起来
take up|phr.|开始从事；占用
        `,
      },
    ],
  },
];

function parseWords(raw, semesterId, unitIndex) {
  return raw
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, wordIndex) => {
      const [word, partOfSpeech, meaning, ...extra] = line.split("|").map((value) => value.trim());
      if (!word || !partOfSpeech || !meaning || extra.length > 0) {
        throw new Error(`Bad word row in ${semesterId} Unit ${unitIndex + 1}: ${line}`);
      }
      return {
        id: `${semesterId}-${unitIndex + 1}-${wordIndex + 1}`,
        word,
        meaning,
        partOfSpeech,
      };
    });
}

for (const semester of semesters) {
  const output = {
    semester: semester.id,
    title: semester.title,
    source: "沪教牛津版（深圳常用）核心词表 · 按教材单元主题整理",
    units: semester.units.map((unit, unitIndex) => ({
      name: unit.name,
      words: parseWords(unit.words, semester.id, unitIndex),
    })),
  };

  const targetDirectory = path.join(siteRoot, semester.id);
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.writeFileSync(path.join(targetDirectory, "words.json"), `${JSON.stringify(output, null, 2)}\n`);

  const count = output.units.reduce((total, unit) => total + unit.words.length, 0);
  console.log(`${semester.id}: ${output.units.length} units, ${count} entries`);
}
