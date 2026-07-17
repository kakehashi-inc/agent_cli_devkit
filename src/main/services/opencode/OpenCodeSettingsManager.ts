import { OPENCODE_CONFIG_REL, OPENCODE_WSL_CLI_TEST, SETTINGS_FIELDS } from '../../../shared/agents/opencode/constants';
import { JsonSettingsManager } from '../common/json/JsonSettingsManager';
import { WslDetector } from '../common/wsl/WslDetector';

export class OpenCodeSettingsManager extends JsonSettingsManager {
    constructor(detector: WslDetector) {
        super(detector, {
            configRel: OPENCODE_CONFIG_REL,
            wslTest: OPENCODE_WSL_CLI_TEST,
            fields: SETTINGS_FIELDS,
            initial: { $schema: 'https://opencode.ai/config.json' },
        });
    }
}
