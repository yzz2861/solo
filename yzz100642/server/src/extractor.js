const EXTRACTION_PATTERNS = {
  price: [
    /(?:价格|报价|单价|总价|合计|共计|金额|费用)(?:是|为|：|:)?\s*([￥¥$]?\d+(?:[.,]\d+)?)\s*(?:元|块|万|k|K|美元|美金)?/g,
    /([￥¥$]\d+(?:[.,]\d+)?)\s*(?:元|块|万|k|K)?/g,
    /(\d+(?:[.,]\d+)?)\s*(?:元|块|万|k|K|美元|美金)/g,
    /(?:打|给|优惠)(\d+)\s*%?\s*(?:折|优惠|折扣)/g,
    /(\d+)\s*(?:折|个点)/g,
    /(?:优惠|便宜|减|省)\s*([￥¥$]?\d+(?:[.,]\d+)?)\s*(?:元|块|万)?/g,
  ],
  gift: [
    /(?:赠送|送|赠|免费|送你|赠送你|赠送给你|给你送|附赠)\s*([^。！？，,；;\s]+(?:服务|礼品|礼物|产品|配件|培训|安装|上门|维护)?)/g,
    /(?:免费|赠送|送)\s*(?:的)?\s*([^。！？，,；;]+(?:服务|礼品|礼物|产品|配件|培训|安装|上门|维护))/g,
    /额外赠送\s*([^。！？，,；;]+)/g,
    /(?:大礼包|礼品|赠品)\s*(?:是|为|包括|包含|有)\s*([^。！？，,；;]+)/g,
  ],
  delivery: [
    /(?:交付|交货|发货|到货|送货|安装)\s*(?:时间|日期|期限)?(?:是|为|在)?\s*([^。！？，,；;\s]+(?:天|周|月|日|号|星期|工作日|之前|以内|之内|左右|前后))/g,
    /(\d+)\s*(?:天|周|月|工作日|个工作日)\s*(?:内|之内|以内|左右|后|之后)\s*(?:交付|交货|发货|到货|送货|安装)/g,
    /(?:预计|大概)\s*([^。！？，,；;]+(?:天|周|月|日|号|星期|工作日))\s*(?:左右|前后)?\s*(?:交付|交货|发货)/g,
    /(?:下个|这个)\s*(?:周|月|星期)[一二三四五六日天]?\s*(?:交付|交货|发货|安装)/g,
    /(?:星期|周)[一二三四五六日天]\s*(?:交付|交货|发货|安装)/g,
  ],
  aftersales: [
    /(?:保修|质保|售后|维修|维护|保养)\s*(?:期|时间|服务)?(?:是|为)?\s*([^。！？，,；;]+(?:年|个月|月|天|次|小时))/g,
    /(?:免费|无偿)\s*(?:维修|维护|保养|更换|上门|退换|退货|换货)/g,
    /(?:终身|终生)\s*(?:保修|质保|维修|维护|保养)/g,
    /(?:7天|七天|30天|三十天|一年|三年|五年)\s*(?:无理由|包退|包换|退换货)/g,
    /(?:上门|远程)\s*(?:服务|支持|调试|培训)/g,
  ],
  condition: [
    /(?:需要|得|要)\s*(?:确认|核实|核对|申请|请示|问问|问一下|汇报|上报)\s*[^。！？；;]*/g,
    /(?:如果|要是|假设|万一)\s*[^，,。！？；;]+(?:的话)?[,，]?\s*[^。！？；;]*/g,
    /(?:待定|待确认|待定中|确认中)[^。！？；;]*/g,
    /(?:前提是|条件是)[^。！？；;]*/g,
    /(?:不包含|不含|除外|除非)[^。！？；;]*/g,
  ],
};

const LOW_CONFIDENCE_PATTERNS = {
  uncertainty: [
    /可能|也许|或许|大概|差不多|应该|估计|预计|没准|说不定|尽量|争取|努力|尽可能/,
    /我觉得|我想|我认为|我估计|我猜|个人觉得|个人认为/,
    /应该是|应该可以|应该没问题|应该ok|应该OK/,
  ],
  customerRepeat: [
    /您是说|您刚才说|您说的是|您提到|您之前说/,
    /我理解的是|我的理解是|您的意思是/,
  ],
  emoji: [
    /[\u{1F300}-\u{1F9FF}]/u,
    /[\u{2600}-\u{27BF}]/u,
    /😄|😊|😂|🤣|😍|🥰|😘|👍|👏|🎉|🎊|💪|🙏|😊|😁|😎|🤔|😅/,
  ],
  voiceTranscript: [
    /\[语音\]|\[语音转文字\]|\[转文字\]|语音消息|语音转写/,
    /^[^\w\u4e00-\u9fa5]*语音/,
  ],
  question: [
    /\?|？/,
    /吗\s*[？?。！]?\s*$/,
    /吧\s*[？?]\s*$/,
  ],
};

const COMMITMENT_TYPES = {
  price: '报价折扣',
  gift: '赠品',
  delivery: '交付时间',
  aftersales: '售后承诺',
  condition: '待确认条件',
};

function calculateConfidence(message, sender, isSales) {
  let confidence = 1.0;
  let reasons = [];

  const content = message.content;

  for (const [type, patterns] of Object.entries(LOW_CONFIDENCE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        const penalty = getConfidencePenalty(type);
        confidence *= penalty;
        reasons.push(getConfidenceReason(type, content, pattern));
        break;
      }
    }
  }

  if (!isSales) {
    confidence *= 0.5;
    reasons.push('非销售发言');
  }

  if (message.message_type === 'voice') {
    confidence *= 0.6;
    reasons.push('语音转写内容');
  }

  confidence = Math.max(0.1, Math.min(1.0, confidence));

  return {
    confidence,
    reasons: reasons.length > 0 ? reasons.join('；') : null,
  };
}

function getConfidencePenalty(type) {
  const penalties = {
    uncertainty: 0.5,
    customerRepeat: 0.6,
    emoji: 0.8,
    voiceTranscript: 0.6,
    question: 0.5,
  };
  return penalties[type] || 0.8;
}

function getConfidenceReason(type, content, pattern) {
  const match = content.match(pattern);
  const matchText = match ? match[0] : '';

  const reasons = {
    uncertainty: `包含不确定表述"${matchText}"`,
    customerRepeat: `客户复述内容"${matchText.substring(0, 20)}..."`,
    emoji: `包含表情符号`,
    voiceTranscript: `语音转写内容`,
    question: `疑问句式"${matchText.substring(0, 20)}..."`,
  };
  return reasons[type] || '其他原因';
}

function parseChatContent(rawContent) {
  const messages = [];
  const lines = rawContent.split('\n').filter(line => line.trim());

  let currentMessage = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(?:(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}:\d{2})\s+)?([^：:]+?)[：:]\s*(.+)$/);

    if (headerMatch) {
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, timestamp, sender, content] = headerMatch;
      currentMessage = {
        sender: sender.trim(),
        content: content.trim(),
        timestamp: timestamp || null,
        message_type: detectMessageType(content),
      };
    } else if (currentMessage) {
      currentMessage.content += '\n' + line;
    } else if (line.trim()) {
      currentMessage = {
        sender: '未知',
        content: line.trim(),
        timestamp: null,
        message_type: detectMessageType(line),
      };
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

function detectMessageType(content) {
  if (/\[语音\]|\[语音转文字\]/.test(content)) {
    return 'voice';
  }
  if (/\[图片\]|\[文件\]|\[视频\]/.test(content)) {
    return 'media';
  }
  return 'text';
}

function isSalesPerson(sender) {
  const salesKeywords = /销售|顾问|经理|业务员|代表|我|我们|我方|咱|咱们/;
  const customerKeywords = /客户|先生|女士|老师|总|哥|姐|您|对方|他们|贵方/;

  if (salesKeywords.test(sender) && !customerKeywords.test(sender)) {
    return true;
  }
  if (customerKeywords.test(sender) && !salesKeywords.test(sender)) {
    return false;
  }

  if (/我|我们|我方/.test(sender)) {
    return true;
  }
  if (/您|对方|他们/.test(sender)) {
    return false;
  }

  return true;
}

function extractCommitmentsFromMessage(message, isSales) {
  const commitments = [];
  const { confidence, reasons } = calculateConfidence(message, message.sender, isSales);

  const sentences = splitSentences(message.content);

  for (const sentence of sentences) {
    for (const [type, patterns] of Object.entries(EXTRACTION_PATTERNS)) {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const matches = sentence.matchAll(pattern);

        for (const match of matches) {
          const extractedContent = match[0].trim();

          if (extractedContent.length >= 2 && extractedContent.length <= 200) {
            commitments.push({
              type,
              typeName: COMMITMENT_TYPES[type],
              content: extractedContent,
              original_sentence: sentence.trim(),
              confidence,
              confidence_reason: reasons,
            });
          }
        }
      }
    }
  }

  return deduplicateCommitments(commitments);
}

function splitSentences(content) {
  const sentenceEndings = /[。！？!?；;]+/g;
  const sentences = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceEndings.exec(content)) !== null) {
    const sentence = content.substring(lastIndex, match.index + 1).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = match.index + 1;
  }

  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }
  }

  if (sentences.length === 0 && content.trim()) {
    sentences.push(content.trim());
  }

  return sentences;
}

function deduplicateCommitments(commitments) {
  const seen = new Set();
  return commitments.filter(c => {
    const key = `${c.type}:${c.content}:${c.original_sentence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractCommitments(rawContent, chatId, opportunityId) {
  const messages = parseChatContent(rawContent);
  const allCommitments = [];
  const parsedMessages = [];

  for (const message of messages) {
    const isSales = isSalesPerson(message.sender);
    const commitments = extractCommitmentsFromMessage(message, isSales);

    parsedMessages.push(message);

    if (commitments.length > 0) {
      for (const commitment of commitments) {
        allCommitments.push({
          ...commitment,
          chat_message_id: null,
          opportunity_id: opportunityId,
          status: 'pending',
        });
      }
    }
  }

  return {
    messages: parsedMessages,
    commitments: allCommitments,
  };
}

module.exports = {
  extractCommitments,
  parseChatContent,
  isSalesPerson,
  calculateConfidence,
  COMMITMENT_TYPES,
};
