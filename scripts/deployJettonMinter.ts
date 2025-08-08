import {Cell, toNano} from '@ton/core';
import {JettonMinter} from '../wrappers/JettonMinter';
import {compile, NetworkProvider} from '@ton/blueprint';
import {jettonWalletCodeFromLibrary, promptBool, promptUrl, promptUserFriendlyAddress} from "../wrappers/ui-utils";
import { Librarian } from '../wrappers/Librarian';

export async function run(provider: NetworkProvider) {
    const isTestnet = provider.network() !== 'mainnet';

    const ui = provider.ui();
    const jettonWalletCodeRaw = await compile('JettonWallet', {buildLibrary: false});

    const adminAddress = await promptUserFriendlyAddress("Enter the address of the jetton owner (admin):", ui, isTestnet);

    // e.g "https://bridge.ton.org/token/1/0x111111111117dC0aa78b770fA6A738034120C302.json"
    const jettonMetadataUri = await promptUrl("Enter jetton metadata uri (https://jettonowner.com/jetton.json)", ui)

    const jettonWalletCode = jettonWalletCodeFromLibrary(jettonWalletCodeRaw);

    const librarianCode = await compile('Librarian');
    const librarian = provider.open(Librarian.createFromConfig({code: jettonWalletCodeRaw}, librarianCode));

    const librarianState = await librarian.getState();

    let librarianFound  = false;
    let libraryDeployed = false;

    let emptyCell = new Cell();

    if(librarianState.state.type == 'active') {
        librarianFound = true;
        if(librarianState.state.code && librarianState.state.data) {
            const codeCell = Cell.fromBoc(librarianState.state.code)[0];
            const dataCell = Cell.fromBoc(librarianState.state.data)[0];
            if(codeCell.equals(emptyCell) && dataCell.equals(emptyCell)) {
                libraryDeployed = true;
            }
        }
    }

    if(!(librarianFound && libraryDeployed)) {

        ui.write("DANGER ZONE!");
        if(!librarianFound) {
            ui.write("Librarian contract is not found, run deployLibrary first.")
        } else {
            ui.write("Librarian contract present, but it's state indicates that the library is not yet deployed.");
            ui.write("Re-run deployLibrary but increase the TON amount or adjust librarian DEFAULT_DURATION.");
        }

        if(!await promptBool("Can you guarantee that library is already deployed?", ["Yes", "No"], ui, false)) {
            return -1;
        }
    } else {
        ui.write(`Librarian found at ${librarian.address.toString()}`);
    }

    const minter = provider.open(JettonMinter.createFromConfig({
            admin: adminAddress.address,
            wallet_code: jettonWalletCode,
            jetton_content: {uri: jettonMetadataUri}
        },
        await compile('JettonMinter')));

    await minter.sendDeploy(provider.sender(), toNano("1.5")); // send 1.5 TON
}
