import { v4 as uuidv4 } from 'uuid'
import type { Project } from '../types'

export function loadSampleProject(): Project {
  const ch1Id = uuidv4()
  const ch2Id = uuidv4()
  const ch3Id = uuidv4()
  const ch4Id = uuidv4()
  const ch5Id = uuidv4()
  const ch6Id = uuidv4()

  const b1_1 = uuidv4()
  const b1_2 = uuidv4()
  const b1_3 = uuidv4()
  const b2_1 = uuidv4()
  const b2_2 = uuidv4()
  const b3_1 = uuidv4()
  const b3_2 = uuidv4()

  return {
    id: uuidv4(),
    title: '古宅祭魂',
    description: '一个关于家族诅咒与古老仪式的恐怖故事。玩家在祖父去世后回到老宅，发现家族隐藏的秘密...',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [
      {
        id: ch1Id,
        sceneName: '第一章：归来',
        fearAtmosphere: '压抑 · 陌生 · 回忆',
        keyItems: ['老宅钥匙', '遗照', '泛黄的日记'],
        currentCurseLevel: 0,
        narrativeText: '你站在老宅门前，雨水顺着黑伞滑落。祖父的葬礼刚结束，律师说他在遗嘱中指定你接收这栋房子，以及那个"家族代代相传的责任"。\n\n门吱呀一声打开，一股腐朽混合着檀香的气味扑面而来。大厅的阴影里，似乎有什么东西在注视着你。\n\n玄关的桌子上放着三样东西：一张泛黄的老照片、一本封皮残破的日记，还有一叠写满奇怪符号的宣纸。',
        branches: [
          {
            id: b1_1,
            choiceText: '拿起日记仔细阅读',
            cost: '时间流逝，意识开始模糊',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '祖父在日记中反复提到"月圆之夜"和"血祭"',
            outcomeType: 'normal',
            curseDelta: 5,
            nextChapterId: ch2Id,
            foreshadowing: '日记最后一页写着："如果你在读这个，说明已经太迟了。"',
            symbols: ['☽', '血'],
            symbolOverrides: {},
            notes: ''
          },
          {
            id: b1_2,
            choiceText: '端详那张老照片',
            cost: '发现令人不安的细节',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '照片上多了一个不该存在的人影',
            outcomeType: 'mild_mutation',
            curseDelta: 10,
            nextChapterId: ch3Id,
            foreshadowing: '照片背面写着"1987年，最后一次完整的家族合影"',
            symbols: ['◯'],
            symbolOverrides: {},
            notes: ''
          },
          {
            id: b1_3,
            choiceText: '无视这些，直接上楼',
            cost: '错过关键信息',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '你感觉到身后有脚步声，但回头什么都没有',
            outcomeType: 'normal',
            curseDelta: 2,
            nextChapterId: ch4Id,
            foreshadowing: '楼梯扶手上的木纹，似乎组成了某种图案',
            symbols: [],
            symbolOverrides: {},
            notes: ''
          }
        ],
        isEnding: false,
        x: 80,
        y: 200
      },
      {
        id: ch2Id,
        sceneName: '第二章：家族诅咒',
        fearAtmosphere: '恐惧 · 真相 · 宿命',
        keyItems: ['残破日记', '家徽戒指'],
        currentCurseLevel: 5,
        narrativeText: '日记记录了七代人的恐惧。你的家族世代守护着某种"东西"，以人血为祭，换来家族的兴旺。每一代必须选出一人，在月圆之夜完成仪式。\n\n祖父在日记最后写道："这一代，我选择了你。"\n\n突然，房间的灯光开始闪烁。你听到地下室传来锁链拖动的声音。',
        branches: [
          {
            id: b2_1,
            choiceText: '勇敢地走向地下室',
            cost: '直面恐惧',
            triggerCondition: '诅咒值 >= 5',
            structuredConditions: [],
            characterMemory: '你看到了墙壁上那些和宣纸上一模一样的符号',
            outcomeType: 'normal',
            curseDelta: 15,
            nextChapterId: ch5Id,
            foreshadowing: '地下室的门是从外面锁上的...但里面有东西在推门',
            symbols: ['⬡', '☽'],
            symbolOverrides: {},
            notes: ''
          },
          {
            id: b2_2,
            choiceText: '立刻逃离老宅',
            cost: '诅咒标记已刻入血脉',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '你跑出门时，看到玻璃窗上自己的倒影在微笑，但你没有',
            outcomeType: 'irreversible_pollution',
            curseDelta: 25,
            nextChapterId: ch6Id,
            foreshadowing: '逃跑并不能解决问题，它只会跟着你',
            symbols: ['影'],
            symbolOverrides: {},
            notes: ''
          }
        ],
        isEnding: false,
        x: 400,
        y: 80
      },
      {
        id: ch3Id,
        sceneName: '第二章：照片中的人影',
        fearAtmosphere: '诡异 · 不安 · 窥视感',
        keyItems: ['诡异合照', '放大镜'],
        currentCurseLevel: 10,
        narrativeText: '你把照片拿到灯下。照片上是三代族人，背景是这座老宅的大厅。\n\n但数来数去，照片中有十四个人，而你从家族树中知道，那一年应该只有十三位族人在世。\n\n多出的那个人站在最后一排角落，穿着深色长袍，脸藏在帽檐下。你试着用放大镜去看——\n\n那人的脸，和你一模一样。',
        branches: [
          {
            id: b3_1,
            choiceText: '烧掉照片',
            cost: '激怒了什么',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '照片燃烧时发出了凄厉的尖叫，像是活物',
            outcomeType: 'irreversible_pollution',
            curseDelta: 20,
            nextChapterId: ch5Id,
            foreshadowing: '火光中，你看到那个人影从照片里走了出来',
            symbols: ['🔥'],
            symbolOverrides: {},
            notes: ''
          },
          {
            id: b3_2,
            choiceText: '把照片放回原处',
            cost: '它记住了你',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '你放下照片时，注意到那个人的位置似乎变了',
            outcomeType: 'mild_mutation',
            curseDelta: 12,
            nextChapterId: ch4Id,
            foreshadowing: '有些东西，一旦被看见就无法回头',
            symbols: ['◯'],
            symbolOverrides: {},
            notes: ''
          }
        ],
        isEnding: false,
        x: 400,
        y: 220
      },
      {
        id: ch4Id,
        sceneName: '第三章：走廊尽头',
        fearAtmosphere: '紧张 · 压迫 · 未知',
        keyItems: ['手电筒'],
        currentCurseLevel: 8,
        narrativeText: '二楼走廊的灯坏了，只有你的手电筒照亮前方一小片区域。\n\n走廊很长，你数了数，一共七扇门。但你记得建筑图纸上，二楼应该只有六间房。\n\n第七扇门在走廊尽头，没有门把手，门缝中透出暗红色的光。\n\n你听到门后传来低低的吟唱声，是你从未听过的语言，但你发现自己竟然能听懂其中几个词——"\n血"、"献祭"、"永恒"。',
        branches: [
          {
            id: uuidv4(),
            choiceText: '推开那扇多出来的门',
            cost: '未知的代价',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '门后是一个祭堂，中央的祭坛上放着一面古铜镜',
            outcomeType: 'normal',
            curseDelta: 18,
            nextChapterId: ch5Id,
            foreshadowing: '镜子里映照出的，不是现在的你',
            symbols: ['⌘', '镜'],
            symbolOverrides: {},
            notes: ''
          },
          {
            id: uuidv4(),
            choiceText: '尝试打开其他房间',
            cost: '浪费的时间让它靠近了',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '每个房间里都有一张床，每张床上都躺着一个你',
            outcomeType: 'death_ending',
            curseDelta: 0,
            nextChapterId: null,
            foreshadowing: '你分不清楚哪个才是真正的自己了',
            symbols: ['床'],
            symbolOverrides: {},
            notes: '死亡结局：在无数个自我中迷失'
          }
        ],
        isEnding: false,
        x: 720,
        y: 150
      },
      {
        id: ch5Id,
        sceneName: '第四章：仪式',
        fearAtmosphere: '极致恐惧 · 抉择 · 命运',
        keyItems: ['祭文', '匕首', '铜镜'],
        currentCurseLevel: 25,
        narrativeText: '你站在祭堂中央。四面墙壁画满了可怖的图腾，烛火在无风的情况下疯狂摇曳。\n\n铜镜中的你，嘴角挂着一丝诡异的微笑，尽管你知道自己面无表情。\n\n祖父的声音不知从何处传来："孩子，选择吧——继承诅咒，让家族延续；或者终结它，让一切归于虚无。"',
        branches: [
          {
            id: uuidv4(),
            choiceText: '读完祭文，继承诅咒',
            cost: '失去身为人类的某些东西',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '你感觉自己的影子开始独立行动',
            outcomeType: 'irreversible_pollution',
            curseDelta: 50,
            nextChapterId: null,
            foreshadowing: '你成为了新的守护者，但守护的是什么？',
            symbols: ['☽', '⬡'],
            symbolOverrides: {},
            notes: '结局：成为新的诅咒守护者'
          },
          {
            id: uuidv4(),
            choiceText: '用匕首刺向镜中的自己',
            cost: '生命',
            triggerCondition: '诅咒值 >= 20',
            structuredConditions: [],
            characterMemory: '镜中你的表情变成了惊恐，这是你第一次看到它流露出感情',
            outcomeType: 'death_ending',
            curseDelta: 0,
            nextChapterId: null,
            foreshadowing: '诅咒和你一同碎裂，还是你成为了它的一部分？',
            symbols: ['🔪', '镜'],
            symbolOverrides: {},
            notes: '死亡结局：与诅咒同归于尽'
          },
          {
            id: uuidv4(),
            choiceText: '熄灭所有蜡烛',
            cost: '在黑暗中面对',
            triggerCondition: '无',
            structuredConditions: [],
            characterMemory: '黑暗中，你感觉到有无数只手在触碰你的身体',
            outcomeType: 'normal',
            curseDelta: 30,
            nextChapterId: ch6Id,
            foreshadowing: '黑暗比你想象的要温暖',
            symbols: ['🕯'],
            symbolOverrides: {},
            notes: ''
          }
        ],
        isEnding: false,
        x: 1040,
        y: 100
      },
      {
        id: ch6Id,
        sceneName: '终章：归处',
        fearAtmosphere: '虚无 · 平静 · 永恒',
        keyItems: [],
        currentCurseLevel: 60,
        narrativeText: '你睁开眼。\n\n你站在老宅门前，雨水顺着黑伞滑落。\n\n一切似乎和刚来时一样，但你知道有些东西已经永远不同了。\n\n你的影子在阳光下比其他人的要深一点，长一点。\n\n每当月圆之夜，你都会听到一个声音在你脑海深处低语。\n\n有时，在镜子里，你会看到自己露出一个不属于你的微笑。\n\n但生活还要继续。\n\n毕竟，这就是家族的命运。',
        branches: [],
        isEnding: true,
        endingType: 'bad',
        endingDescription: '你成为了家族诅咒的新载体，带着它的印记继续生活。影子会偶尔独立行动，镜中会浮现陌生的微笑，但你已经学会了与它共存。这是血脉的宿命，也是你无法逃避的责任。',
        x: 1040,
        y: 280
      }
    ],
    curseRules: [
      {
        id: uuidv4(),
        name: '血脉印记',
        description: '家族直系血亲天生带有诅咒印记，随年龄增长逐渐显现。',
        triggerCondition: '进入老宅或接触家族物品',
        curseEffect: '诅咒值最低为5，无法通过任何方式降低至0',
        curseDelta: 5,
        chapters: [ch1Id, ch2Id]
      },
      {
        id: uuidv4(),
        name: '看见即契约',
        description: '当玩家目击到超自然现象时，即与诅咒建立了连接。',
        triggerCondition: '查看照片、镜子、或任何灵异现象',
        curseEffect: '诅咒值 +10，且该章节之后的所有诅咒增量翻倍',
        curseDelta: 10,
        chapters: [ch3Id, ch4Id]
      },
      {
        id: uuidv4(),
        name: '月圆之夜',
        description: '特定时间点诅咒的力量达到顶峰。',
        triggerCondition: '进入地下室或祭堂',
        curseEffect: '所有恐惧判定难度提升，诅咒伤害加深',
        curseDelta: 8,
        chapters: [ch2Id, ch5Id]
      }
    ],
    symbols: {
      '☽': '代表月亮与女性力量，家族诅咒的核心符号，暗示月圆之夜的仪式',
      '血': '血祭的象征，家族通过鲜血与诅咒缔结契约',
      '◯': '完整性与无限循环，代表诅咒的轮回本质',
      '⬡': '封印与守护，标记着被镇压之物的所在',
      '🔥': '净化与毁灭的双重含义，火焰可以净化诅咒也会激怒它',
      '镜': '自我认知与异界通道，镜子是现实与诅咒世界的边界',
      '影': '影子诅咒，标记被诅咒者的影子会逐渐独立',
      '⌘': '祭堂的标记，代表仪式空间',
      '🔪': '牺牲与终结的工具',
      '🕯': '仪式蜡烛，火焰代表守护之光',
      '床': '梦境与死亡的过渡点'
    }
  }
}
