#!/usr/bin/env node

/**
 * AI依赖审计工具 - 模型替代性测试
 * 
 * 功能：
 * 1. 从数据库随机抽取10条记录
 * 2. 用当前模型跑一遍（基准线）
 * 3. 用备选模型跑一遍
 * 4. 对比结果：分类一致率、JSON正确率、响应延迟
 * 
 * 使用：node substitution-test.js <配置文件>
 */

const fs = require('fs');
const path = require('path');

class SubstitutionTester {
  constructor(config) {
    this.config = config;
    this.results = {
      testDate: new Date().toISOString(),
      baselineModel: config.baselineModel,
      candidateModels: [],
      testSamples: [],
      summary: {},
    };
  }

  /**
   * 执行测试
   */
  async runTest() {
    console.log(`🧪 模型替代性测试开始\n`);
    console.log(`基准模型: ${this.config.baselineModel.name}`);
    console.log(`备选模型: ${this.config.candidateModels.map(m => m.name).join(', ')}\n`);

    // 步骤1: 准备测试样本
    console.log(`📝 准备测试样本...`);
    await this.prepareTestSamples();
    console.log(`✓ 已准备 ${this.results.testSamples.length} 条样本\n`);

    // 步骤2: 基准测试
    console.log(`🎯 基准模型测试中...`);
    const baselineResults = await this.testModel(this.config.baselineModel, this.results.testSamples);
    console.log(`✓ 基准测试完成\n`);

    // 步骤3: 备选模型测试
    for (const candidateModel of this.config.candidateModels) {
      console.log(`🔄 测试备选模型: ${candidateModel.name}...`);
      const candidateResults = await this.testModel(candidateModel, this.results.testSamples);
      
      // 步骤4: 对比结果
      const comparison = this.compareResults(baselineResults, candidateResults);
      
      this.results.candidateModels.push({
        model: candidateModel,
        results: candidateResults,
        comparison: comparison,
      });
      
      console.log(`✓ ${candidateModel.name} 测试完成`);
      console.log(`  - 分类一致率: ${(comparison.categoryMatchRate * 100).toFixed(1)}%`);
      console.log(`  - JSON正确率: ${(comparison.jsonValidRate * 100).toFixed(1)}%`);
      console.log(`  - 平均延迟: ${comparison.avgLatency.toFixed(0)}ms`);
      console.log(`  - 可替代性: ${comparison.canReplace ? '✅ 是' : '❌ 否'}\n`);
    }

    // 生成摘要
    this.generateSummary();
    
    console.log(`\n✅ 测试完成！`);
    return this.results;
  }

  /**
   * 准备测试样本
   */
  async prepareTestSamples() {
    // 这里使用模拟数据
    // 真实场景应该从数据库读取
    const samples = [
      {
        id: 'sample-1',
        content: '明天下午3点要交软件工程实验报告',
        expectedCategory: 'task',
      },
      {
        id: 'sample-2',
        content: '今天天气真好，心情很舒畅',
        expectedCategory: 'diary',
      },
      {
        id: 'sample-3',
        content: '做一个AI驱动的个人知识管理系统',
        expectedCategory: 'idea',
      },
      {
        id: 'sample-4',
        content: '图书馆开放时间：周一到周五 8:00-22:00',
        expectedCategory: 'memo',
      },
      {
        id: 'sample-5',
        content: 'https://arxiv.org/abs/2607.07359 牛津AI韧性论文',
        expectedCategory: 'collection',
      },
      {
        id: 'sample-6',
        content: '周五下午2点和导师讨论论文',
        expectedCategory: 'schedule',
      },
      {
        id: 'sample-7',
        content: '买牛奶、面包、鸡蛋',
        expectedCategory: 'task',
      },
      {
        id: 'sample-8',
        content: '今天学习了动态规划，终于理解了状态转移方程',
        expectedCategory: 'diary',
      },
      {
        id: 'sample-9',
        content: '用区块链做去中心化的身份认证系统',
        expectedCategory: 'idea',
      },
      {
        id: 'sample-10',
        content: 'WiFi密码：MyHome2026',
        expectedCategory: 'memo',
      },
    ];

    this.results.testSamples = samples;
  }

  /**
   * 测试单个模型
   */
  async testModel(model, samples) {
    const results = [];

    for (const sample of samples) {
      const startTime = Date.now();
      
      try {
        // 模拟API调用（真实场景应该调用实际的AI API）
        const response = await this.callModelAPI(model, sample.content);
        const latency = Date.now() - startTime;

        results.push({
          sampleId: sample.id,
          success: true,
          response: response,
          latency: latency,
          error: null,
        });
      } catch (error) {
        results.push({
          sampleId: sample.id,
          success: false,
          response: null,
          latency: Date.now() - startTime,
          error: error.message,
        });
      }

      // 避免API限流
      await this.sleep(100);
    }

    return results;
  }

  /**
   * 调用模型API（模拟）
   */
  async callModelAPI(model, content) {
    // 这里是模拟实现
    // 真实场景应该调用实际的AI API
    
    await this.sleep(Math.random() * 2000 + 500); // 模拟延迟 500-2500ms

    // 模拟不同模型的表现
    const categories = ['task', 'idea', 'memo', 'collection', 'diary', 'schedule'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // 模拟JSON格式错误（某些模型会返回）
    const hasFormatError = Math.random() < (model.name.includes('glm') ? 0.2 : 0.05);
    
    if (hasFormatError) {
      // 返回带前后缀的非标准JSON
      return `好的，分析结果如下：\n${JSON.stringify({
        category: randomCategory,
        tags: ['标签1', '标签2'],
        entities: { time: [], people: [], location: [] },
      })}\n希望对你有帮助！`;
    }

    // 返回标准JSON
    return JSON.stringify({
      category: randomCategory,
      tags: ['标签1', '标签2'],
      entities: { time: [], people: [], location: [] },
      summary: '这是一条摘要',
    });
  }

  /**
   * 对比结果
   */
  compareResults(baselineResults, candidateResults) {
    let categoryMatches = 0;
    let jsonValidCount = 0;
    let totalLatency = 0;
    let validCount = 0;

    for (let i = 0; i < baselineResults.length; i++) {
      const baseline = baselineResults[i];
      const candidate = candidateResults[i];

      if (!baseline.success || !candidate.success) continue;

      validCount++;
      totalLatency += candidate.latency;

      // 检查JSON格式
      const isValidJSON = this.isValidJSON(candidate.response);
      if (isValidJSON) {
        jsonValidCount++;
      }

      // 检查分类一致性
      const baselineCategory = this.extractCategory(baseline.response);
      const candidateCategory = this.extractCategory(candidate.response);
      
      if (baselineCategory && candidateCategory && baselineCategory === candidateCategory) {
        categoryMatches++;
      }
    }

    const categoryMatchRate = validCount > 0 ? categoryMatches / validCount : 0;
    const jsonValidRate = validCount > 0 ? jsonValidCount / validCount : 0;
    const avgLatency = validCount > 0 ? totalLatency / validCount : 0;

    // 判断是否可替代
    const canReplace = categoryMatchRate >= 0.7 && jsonValidRate >= 0.9;

    return {
      categoryMatchRate,
      jsonValidRate,
      avgLatency,
      canReplace,
      details: {
        totalSamples: baselineResults.length,
        validSamples: validCount,
        categoryMatches,
        jsonValidCount,
      }
    };
  }

  /**
   * 检查是否为有效JSON
   */
  isValidJSON(text) {
    try {
      // 尝试提取JSON
      let jsonText = text.trim();
      
      // 去除可能的前后缀
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      
      if (start !== -1 && end !== -1) {
        jsonText = jsonText.slice(start, end + 1);
      }

      JSON.parse(jsonText);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 提取分类
   */
  extractCategory(text) {
    try {
      const jsonText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const parsed = JSON.parse(jsonText);
      return parsed.category || null;
    } catch {
      return null;
    }
  }

  /**
   * 生成摘要
   */
  generateSummary() {
    this.results.summary = {
      baselineModel: this.config.baselineModel.name,
      totalCandidates: this.config.candidateModels.length,
      viableCandidates: this.results.candidateModels.filter(c => c.comparison.canReplace).length,
      bestCandidate: null,
    };

    // 找出最佳备选模型
    if (this.results.candidateModels.length > 0) {
      const best = this.results.candidateModels.reduce((best, current) => {
        if (!best) return current;
        
        const bestScore = best.comparison.categoryMatchRate + best.comparison.jsonValidRate;
        const currentScore = current.comparison.categoryMatchRate + current.comparison.jsonValidRate;
        
        return currentScore > bestScore ? current : best;
      }, null);

      this.results.summary.bestCandidate = best.model.name;
    }
  }

  /**
   * 保存结果
   */
  saveResults(outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2), 'utf-8');
    console.log(`\n💾 测试结果已保存到: ${outputPath}`);
  }

  /**
   * 工具方法：延迟
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
使用方法：
  node substitution-test.js <配置文件>

配置文件格式（JSON）：
{
  "baselineModel": {
    "name": "gpt-4o-mini",
    "apiKey": "your-api-key",
    "baseUrl": "https://api.openai.com/v1"
  },
  "candidateModels": [
    {
      "name": "deepseek-chat",
      "apiKey": "your-api-key",
      "baseUrl": "https://api.deepseek.com/v1"
    }
  ]
}

示例：
  node substitution-test.js ./test-config.json
    `);
    process.exit(1);
  }

  const configPath = args[0];

  // 检查配置文件是否存在
  if (!fs.existsSync(configPath)) {
    console.error(`❌ 配置文件不存在: ${configPath}`);
    console.log(`\n💡 创建默认配置文件...`);
    
    // 创建示例配置
    const exampleConfig = {
      baselineModel: {
        name: 'gpt-4o-mini',
        apiKey: 'your-openai-api-key',
        baseUrl: 'https://api.openai.com/v1'
      },
      candidateModels: [
        {
          name: 'deepseek-chat',
          apiKey: 'your-deepseek-api-key',
          baseUrl: 'https://api.deepseek.com/v1'
        },
        {
          name: 'qwen-vl-plus',
          apiKey: 'your-qwen-api-key',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        }
      ]
    };
    
    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2), 'utf-8');
    console.log(`✅ 已创建示例配置: ${configPath}`);
    console.log(`⚠️  请先编辑配置文件，填入真实的API Key\n`);
    process.exit(0);
  }

  // 读取配置
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  // 检查API Key
  if (config.baselineModel.apiKey.includes('your-') || 
      config.candidateModels.some(m => m.apiKey.includes('your-'))) {
    console.error(`❌ 请先在配置文件中填入真实的API Key`);
    process.exit(1);
  }

  // 执行测试
  const tester = new SubstitutionTester(config);
  const results = await tester.runTest();
  
  // 保存结果
  const outputPath = path.join(path.dirname(configPath), 'substitution-test-result.json');
  tester.saveResults(outputPath);
}

// 执行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
}

module.exports = { SubstitutionTester };
