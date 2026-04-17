export namespace flowcollectorStatusSelectors {
    export const statusIndicator = '#flowcollector-status-indicator'
    export const readyRow = '[id=Ready-row]'
    export const agentReadyRow = '[id=WaitingEBPFAgents-row]'
    export const pluginReadyRow = '[id=WaitingWebConsole-row]'
    export const monitoringReadyRow = '[id=WaitingMonitoring-row]'
    export const configIssueRow = '[id=ConfigurationIssue-row]'
    export const configWarningAlert = '.pf-v5-c-alert.pf-m-warning.pf-m-inline'
    export const configErrorAlert = '.pf-v5-c-alert.pf-m-danger.pf-m-inline'
}

export const flowcollectorStatusPage = {
    visit: () => {
        cy.visit('k8s/cluster/flows.netobserv.io~v1beta2~FlowCollector/status')
        cy.get(flowcollectorStatusSelectors.readyRow, { timeout: 30000 }).should('exist')
    }
}
