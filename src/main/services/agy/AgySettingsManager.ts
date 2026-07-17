import { AGY_SETTINGS_REL, AGY_WSL_CLI_TEST, SETTINGS_FIELDS } from '../../../shared/agents/agy/constants';
import { JsonSettingsManager } from '../common/json/JsonSettingsManager';
import { WslDetector } from '../common/wsl/WslDetector';

export class AgySettingsManager extends JsonSettingsManager {
    constructor(detector: WslDetector) {
        super(detector, { configRel: AGY_SETTINGS_REL, wslTest: AGY_WSL_CLI_TEST, fields: SETTINGS_FIELDS });
    }
}
