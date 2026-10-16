#!/usr/bin/env node

/**
 * AI依赖审计工具 - 代码扫描器
 * 
 * 功能：
 * 1. 扫描代码中的AI API调用点
 * 2. 提取配置存储位置
 * 3. 分析业务规则（Prompt模板）
 * 4. 生成依赖清单JSON
 * 
 * 使用：node scanner.js <项目路径>
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 需要扫描的文件类型
  targetExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java'],
  
  // AI API调用特征（正则表达式）
  apiCallPatterns: [
    /\/chat\/completions/i,
    /\/v1\/completions/i,
    /\/audio\/transcriptions/i,
    /\/embeddings/i,
    /openai\.chat\.completions\.create/i,
    /anthropic\.messages\.create/i,
    /genai\.GenerativeModel/i,
  ],
  
  // 配置关键词
  configPatterns: [
    /api[_-]?key/i,
    /base[_-]?url/i,
    /model[_-]?name/i,
    /llm[_-]?model/i,
  ],
  
  // Prompt关键词
  promptPatterns: [
    /SYSTEM[_-]?PROMPT/i,
    /USER[_-]?PROMPT/i,
    /INSTRUCTION/i,
    /system[_-]?message/i,
  ],
  
  // 排除目录
  excludeDirs: ['node_modules', 'dist', 'build', '.git', 'coverage', '__pycache__'],
};

class AIScanner {
  constructor(projectPath) {
    this.projectPath = path.resolve(projectPath);
    this.results = {
      projectName: path.basename(this.projectPath),
      scanDate: new Date().toISOString(),
      dependencies: [],
      configLocations: [],
      prompts: [],
      summary: {
        totalFiles: 0,
        scannedFiles: 0,
        apiCallPoints: 0,
        configPoints: 0,
        promptPoints: 0,
      }
    };
  }

  /**
   * 执行扫描
   */
  async scan() {
    console.log(`🔍 开始扫描项目: ${this.projectPath}\n`);
    
    // 递归扫描所有文件
    await this.scanDirectory(this.projectPath);
    
    // 生成摘要
    this.generateSummary();
    
    console.log(`\n✅ 扫描完成！`);
    console.log(`📊 统计：`);
    console.log(`   - 扫描文件: ${this.results.summary.scannedFiles}`);
    console.log(`   - AI调用点: ${this.results.summary.apiCallPoints}`);
    console.log(`   - 配置点: ${this.results.summary.configPoints}`);
    console.log(`   - Prompt点: ${this.results.summary.promptPoints}`);
    
    return this.results;
  }

  /**
   * 递归扫描目录
   */
  async scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 跳过排除目录
        if (CONFIG.excludeDirs.includes(entry.name)) {
          continue;
        }
        await this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        this.results.summary.totalFiles++;
        
        // 只扫描目标文件类型
        const ext = path.extname(entry.name);
        if (CONFIG.targetExtensions.includes(ext)) {
          await this.scanFile(fullPath);
        }
      }
    }
  }

  /**
   * 扫描单个文件
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(this.projectPath, filePath);
      
      this.results.summary.scannedFiles++;

      // 按行扫描
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // 检测API调用
        CONFIG.apiCallPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            this.addDependency(relativePath, lineNumber, line, 'api-call');
          }
        });

        // 检测配置
        CONFIG.configPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            this.addConfig(relativePath, lineNumber, line);
          }
        });

        // 检测Prompt
        CONFIG.promptPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            this.addPrompt(relativePath, lineNumber, line, content);
          }
        });
      });
    } catch (error) {
      console.warn(`⚠️  无法读取文件: ${filePath}`, error.message);
    }
  }

  /**
   * 添加依赖点
   */
  addDependency(file, line, code, type) {
    // 去重：同一文件同一行只记录一次
    const existing = this.results.dependencies.find(
      d => d.file === file && d.line === line
    );
    if (existing) return;

    this.results.dependencies.push({
      id: `dep-${this.results.dependencies.length + 1}`,
      type,
      file,
      line,
      code: code.trim().slice(0, 100), // 只保留前100字符
    });
    
    this.results.summary.apiCallPoints++;
  }

  /**
   * 添加配置点
   */
  addConfig(file, line, code) {
    // 去重
    const existing = this.results.configLocations.find(
      c => c.file === file && c.line === line
    );
    if (existing) return;

    this.results.configLocations.push({
      file,
      line,
      code: code.trim().slice(0, 100),
    });
    
    this.results.summary.configPoints++;
  }

  /**
   * 添加Prompt点
   */
  addPrompt(file, line, code, fullContent) {
    // 去重
    const existing = this.results.prompts.find(
      p => p.file === file && p.line === line
    );
    if (existing) return;

    // 尝试提取完整的Prompt内容（多行字符串）
    const promptContent = this.extractPromptContent(fullContent, line);

    this.results.prompts.push({
      file,
      line,
      preview: code.trim().slice(0, 100),
      fullContent: promptContent ? promptContent.slice(0, 500) : null,
    });
    
    this.results.summary.promptPoints++;
  }

  /**
   * 提取完整Prompt内容（处理多行字符串）
   */
  extractPromptContent(content, startLine) {
    const lines = content.split('\n');
    let result = [];
    let inString = false;
    let braceCount = 0;

    // 从startLine开始向后扫描
    for (let i = startLine - 1; i < lines.length && i < startLine + 50; i++) {
      const line = lines[i];
      
      // 检测字符串开始
      if (line.includes('`') || line.includes('"') || line.includes("'")) {
        inString = true;
      }

      result.push(line);

      // 检测字符串结束
      if (inString && (line.includes('`;') || line.includes('";') || line.includes("';"))) {
        break;
      }

      // 如果已经收集了20行还没结束，可能不是Prompt
      if (result.length > 20) {
        break;
      }
    }

    return result.join('\n');
  }

  /**
   * 生成摘要
   */
  generateSummary() {
    // 按文件分组统计
    const fileGroups = {};
    this.results.dependencies.forEach(d => {
      if (!fileGroups[d.file]) {
        fileGroups[d.file] = [];
      }
      fileGroups[d.file].push(d);
    });

    this.results.summary.filesWithDependencies = Object.keys(fileGroups).length;
    this.results.summary.fileGroups = fileGroups;
  }

  /**
   * 保存结果到JSON
   */
  saveResults(outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2), 'utf-8');
    console.log(`\n💾 结果已保存到: ${outputPath}`);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
使用方法：
  node scanner.js <项目路径> [输出文件]

示例：
  node scanner.js ./my-project
  node scanner.js ./my-project ./output/scan-result.json
    `);
    process.exit(1);
  }

  const projectPath = args[0];
  const outputPath = args[1] || path.join(process.cwd(), 'scan-result.json');

  // 检查项目路径是否存在
  if (!fs.existsSync(projectPath)) {
    console.error(`❌ 项目路径不存在: ${projectPath}`);
    process.exit(1);
  }

  // 执行扫描
  const scanner = new AIScanner(projectPath);
  const results = await scanner.scan();
  
  // 保存结果
  scanner.saveResults(outputPath);
}

// 执行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 扫描失败:', error);
    process.exit(1);
  });
}

module.exports = { AIScanner };
