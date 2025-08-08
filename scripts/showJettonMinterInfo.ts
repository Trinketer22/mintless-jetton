import {compile, NetworkProvider} from '@ton/blueprint';
import {promptUserFriendlyAddress} from "../wrappers/ui-utils";
import {checkJettonMinter} from "./JettonMinterChecker";

export async function run(provider: NetworkProvider) {
    const isTestnet = provider.network() !== 'mainnet';

    const ui = provider.ui();

    const jettonMinterCode = await compile('JettonMinter');
    const jettonWalletCode = await compile('JettonWallet');

    const jettonMinterAddress = await promptUserFriendlyAddress("Enter the address of the jetton minter", ui, isTestnet);

    try {
        await checkJettonMinter(jettonMinterAddress, jettonMinterCode, jettonWalletCode, provider, ui, isTestnet, false);
    } catch (e: any) {
        ui.write(e.message);
        return;
    }
}
