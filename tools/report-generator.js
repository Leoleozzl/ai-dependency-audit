#!/usr/bin/env node

/**
 * AI依赖审计工具 - 报告生成器
 * 
 * 功能：基于扫描结果生成可视化HTML报告
 * 使用：node report-generator.js <扫描结果JSON> <输出HTML>
 */

const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(scanResultPath) {
    this.scanResult = JSON.parse(fs.readFileSync(scanResultPath, 'utf-8'));
    this.criticalityScores = this.calculateCriticality();
  }

  /**
   * 计算关键性分数（基于调用频率和位置）
   */
  calculateCriticality() {
    const scores = {};
    
    // 关键文件权重
    const criticalFiles = {
      'ai.service': 5,
      'ai.controller': 4,
      'service': 3,
      'controller': 2,
    };

    this.scanResult.dependencies.forEach(dep => {
      let score = 1;
      
      // 根据文件名判断权重
      Object.keys(criticalFiles).forEach(key => {
        if (dep.file.toLowerCase().includes(key)) {
          score = Math.max(score, criticalFiles[key]);
        }
      });

      scores[dep.id] = score;
    });

    return scores;
  }

  /**
   * 生成HTML报告
   */
  generateHTML() {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI依赖审计报告 - ${this.scanResult.projectName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: light-dark(#f5f5f5, #0A0D12);
      color: light-dark(#212529, #e9ecef);
      padding: 2rem;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: light-dark(#ffffff, #0F131C);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      border: 1px solid light-dark(#dee2e6, #2d3748);
    }
    
    .header h1 {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    
    .header .meta {
      color: light-dark(#6c757d, #adb5bd);
      font-size: 0.875rem;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .stat-card {
      background: light-dark(#ffffff, #0F131C);
      border: 1px solid light-dark(#dee2e6, #2d3748);
      border-radius: 12px;
      padding: 1.5rem;
    }
    
    .stat-value {
      font-size: 2.5rem;
      font-weight: 600;
      color: light-dark(#38BDF8, #38BDF8);
      display: block;
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: light-dark(#6c757d, #adb5bd);
      margin-top: 0.25rem;
    }
    
    .section {
      background: light-dark(#ffffff, #0F131C);
      border: 1px solid light-dark(#dee2e6, #2d3748);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .dep-list {
      display: grid;
      gap: 1rem;
    }
    
    .dep-item {
      background: light-dark(#f8f9fa, #161D2B);
      border-radius: 8px;
      padding: 1rem;
      border-left: 4px solid;
    }
    
    .dep-item.critical {
      border-left-color: light-dark(#EF4444, #F87171);
    }
    
    .dep-item.high {
      border-left-color: light-dark(#F59E0B, #FBBF24);
    }
    
    .dep-item.medium {
      border-left-color: light-dark(#38BDF8, #38BDF8);
    }
    
    .dep-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 0.5rem;
      gap: 1rem;
    }
    
    .dep-file {
      font-weight: 500;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.875rem;
    }
    
    .dep-line {
      font-size: 0.75rem;
      color: light-dark(#6c757d, #adb5bd);
      white-space: nowrap;
    }
    
    .dep-code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.813rem;
      color: light-dark(#495057, #adb5bd);
      padding: 0.5rem;
      background: light-dark(#e9ecef, #0A0D12);
      border-radius: 4px;
      overflow-x: auto;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .badge-critical {
      background: color-mix(in srgb, light-dark(#EF4444, #F87171) 20%, transparent);
      color: light-dark(#EF4444, #F87171);
    }
    
    .badge-high {
      background: color-mix(in srgb, light-dark(#F59E0B, #FBBF24) 20%, transparent);
      color: light-dark(#F59E0B, #FBBF24);
    }
    
    .badge-medium {
      background: color-mix(in srgb, light-dark(#38BDF8, #38BDF8) 20%, transparent);
      color: light-dark(#38BDF8, #38BDF8);
    }
    
    .prompt-preview {
      max-height: 200px;
      overflow-y: auto;
      background: light-dark(#e9ecef, #0A0D12);
      padding: 0.75rem;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.813rem;
      white-space: pre-wrap;
      margin-top: 0.5rem;
    }
    
    .file-group {
      margin-bottom: 1.5rem;
    }
    
    .file-group-title {
      font-weight: 600;
      margin-bottom: 0.75rem;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.875rem;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      
      .header, .section {
        padding: 1.5rem;
      }
      
      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>AI依赖审计报告</h1>
      <div class="meta">
        <div>项目: ${this.scanResult.projectName}</div>
        <div>扫描时间: ${new Date(this.scanResult.scanDate).toLocaleString('zh-CN')}</div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats">
      <div class="stat-card">
        <span class="stat-value">${this.scanResult.summary.scannedFiles}</span>
        <div class="stat-label">扫描文件数</div>
      </div>
      <div class="stat-card">
        <span class="stat-value">${this.scanResult.summary.apiCallPoints}</span>
        <div class="stat-label">AI调用点</div>
      </div>
      <div class="stat-card">
        <span class="stat-value">${this.scanResult.summary.configPoints}</span>
        <div class="stat-label">配置点</div>
      </div>
      <div class="stat-card">
        <span class="stat-value">${this.scanResult.summary.promptPoints}</span>
        <div class="stat-label">Prompt模板</div>
      </div>
    </div>

    <!-- Dependencies -->
    <div class="section">
      <h2 class="section-title">🔌 AI服务依赖点</h2>
      ${this.renderDependencies()}
    </div>

    <!-- Config Locations -->
    <div class="section">
      <h2 class="section-title">⚙️ 配置存储位置</h2>
      ${this.renderConfigLocations()}
    </div>

    <!-- Prompts -->
    <div class="section">
      <h2 class="section-title">📝 业务规则 (Prompt模板)</h2>
      ${this.renderPrompts()}
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * 渲染依赖列表
   */
  renderDependencies() {
    if (this.scanResult.dependencies.length === 0) {
      return '<p style="color: #6c757d;">未发现AI服务调用</p>';
    }

    // 按文件分组
    const groups = {};
    this.scanResult.dependencies.forEach(dep => {
      if (!groups[dep.file]) {
        groups[dep.file] = [];
      }
      groups[dep.file].push(dep);
    });

    let html = '<div class="dep-list">';
    
    Object.keys(groups).forEach(file => {
      const deps = groups[file];
      const maxScore = Math.max(...deps.map(d => this.criticalityScores[d.id] || 1));
      const level = maxScore >= 5 ? 'critical' : maxScore >= 3 ? 'high' : 'medium';
      const badgeClass = maxScore >= 5 ? 'badge-critical' : maxScore >= 3 ? 'badge-high' : 'badge-medium';
      const badgeText = maxScore >= 5 ? '关键' : maxScore >= 3 ? '重要' : '一般';

      html += `
      <div class="file-group">
        <div class="file-group-title">
          ${file} 
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
      `;

      deps.forEach(dep => {
        html += `
        <div class="dep-item ${level}">
          <div class="dep-header">
            <div class="dep-file">${dep.file}</div>
            <div class="dep-line">行 ${dep.line}</div>
          </div>
          <div class="dep-code">${this.escapeHtml(dep.code)}</div>
        </div>
        `;
      });

      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  /**
   * 渲染配置位置
   */
  renderConfigLocations() {
    if (this.scanResult.configLocations.length === 0) {
      return '<p style="color: #6c757d;">未发现配置项</p>';
    }

    // 按文件分组
    const groups = {};
    this.scanResult.configLocations.forEach(config => {
      if (!groups[config.file]) {
        groups[config.file] = [];
      }
      groups[config.file].push(config);
    });

    let html = '<div class="dep-list">';
    
    Object.keys(groups).slice(0, 10).forEach(file => { // 只显示前10个文件
      const configs = groups[file];
      
      html += `
      <div class="file-group">
        <div class="file-group-title">${file}</div>
      `;

      configs.slice(0, 3).forEach(config => { // 每个文件最多显示3个
        html += `
        <div class="dep-item medium">
          <div class="dep-header">
            <div class="dep-file">${config.file}</div>
            <div class="dep-line">行 ${config.line}</div>
          </div>
          <div class="dep-code">${this.escapeHtml(config.code)}</div>
        </div>
        `;
      });

      if (configs.length > 3) {
        html += `<div style="color: #6c757d; font-size: 0.875rem; margin-top: 0.5rem;">... 还有 ${configs.length - 3} 个配置点</div>`;
      }

      html += '</div>';
    });

    if (Object.keys(groups).length > 10) {
      html += `<div style="color: #6c757d; text-align: center; margin-top: 1rem;">... 还有 ${Object.keys(groups).length - 10} 个文件包含配置项</div>`;
    }

    html += '</div>';
    return html;
  }

  /**
   * 渲染Prompt列表
   */
  renderPrompts() {
    if (this.scanResult.prompts.length === 0) {
      return '<p style="color: #6c757d;">未发现Prompt模板</p>';
    }

    let html = '<div class="dep-list">';
    
    this.scanResult.prompts.forEach(prompt => {
      html += `
      <div class="dep-item high">
        <div class="dep-header">
          <div class="dep-file">${prompt.file}</div>
          <div class="dep-line">行 ${prompt.line}</div>
        </div>
        <div class="dep-code">${this.escapeHtml(prompt.preview)}</div>
        ${prompt.fullContent ? `
        <details>
          <summary style="cursor: pointer; color: #38BDF8; margin-top: 0.5rem; font-size: 0.875rem;">查看完整内容</summary>
          <div class="prompt-preview">${this.escapeHtml(prompt.fullContent)}</div>
        </details>
        ` : ''}
      </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 保存HTML报告
   */
  saveReport(outputPath) {
    const html = this.generateHTML();
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ 报告已生成: ${outputPath}`);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
使用方法：
  node report-generator.js <扫描结果JSON> [输出HTML]

示例：
  node report-generator.js ./scan-result.json ./report.html
    `);
    process.exit(1);
  }

  const scanResultPath = args[0];
  const outputPath = args[1] || path.join(path.dirname(scanResultPath), 'audit-report.html');

  // 检查扫描结果是否存在
  if (!fs.existsSync(scanResultPath)) {
    console.error(`❌ 扫描结果文件不存在: ${scanResultPath}`);
    process.exit(1);
  }

  // 生成报告
  const generator = new ReportGenerator(scanResultPath);
  generator.saveReport(outputPath);
  
  console.log(`\n📊 打开报告查看: file://${path.resolve(outputPath)}`);
}

// 执行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 报告生成失败:', error);
    process.exit(1);
  });
}

module.exports = { ReportGenerator };
