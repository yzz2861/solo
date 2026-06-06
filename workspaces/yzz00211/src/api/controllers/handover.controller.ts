import { Request, Response } from 'express';
import { HandoverService } from '../../domain';
import { HandoverRequestDTO } from '../dto/request.dto';
import { HandoverResponseDTO, DECISION_TEXT_MAP } from '../dto/response.dto';
import { mapRequestToDomain } from '../mappers/dto.mapper';

export class HandoverController {
  private handoverService: HandoverService;

  constructor(handoverService?: HandoverService) {
    this.handoverService = handoverService || new HandoverService();
  }

  async processHandover(req: Request, res: Response): Promise<void> {
    try {
      const requestDTO: HandoverRequestDTO = req.body;

      if (!requestDTO.application || !requestDTO.thresholdConfig) {
        res.status(400).json({
          success: false,
          code: 400,
          message: '请求参数不完整',
          error: '缺少 application 或 thresholdConfig',
        });
        return;
      }

      const domainInput = mapRequestToDomain(requestDTO);
      const result = this.handoverService.processHandover(domainInput);

      const response: HandoverResponseDTO = {
        success: true,
        code: 200,
        message: '处理成功',
        data: {
          applicationId: result.applicationId,
          finalState: result.finalState,
          decision: result.decision,
          decisionText: DECISION_TEXT_MAP[result.decision],
          reasons: result.reasons,
          riskTags: result.riskTags,
          riskLevel: result.riskLevel,
          summary: result.summary,
          ruleResults: result.ruleResults,
          recordId: result.recordId,
          recordNo: result.recordNo,
          logCount: result.logCount,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        success: false,
        code: 500,
        message: '服务器内部错误',
        error: err.message,
      });
    }
  }

  getService(): HandoverService {
    return this.handoverService;
  }
}
