import { pluginSelectors } from "@views/netflow-page"
import { Operator } from "@views/netobserv"
import { flowcollectorStatusPage, flowcollectorStatusSelectors } from "@views/flowcollector-status"
import { searchPage } from "@views/search"

describe('Network_Observability FlowCollector status and status indicator tests', { tags: ['Network_Observability'] }, function () {

    before('any test', function () {
        cy.adminCLI(`oc adm policy add-cluster-role-to-user cluster-admin ${Cypress.env('LOGIN_USERNAME')}`)
        cy.uiLogin(Cypress.env('LOGIN_IDP'), Cypress.env('LOGIN_USERNAME'), Cypress.env('LOGIN_PASSWORD'))

        Operator.install()
        cy.checkStorageClass(this)
        Operator.createFlowcollector()
    })

    beforeEach('test', function () {
        cy.clearLocalStorage()
    })

    it("(OCP-88744, kapjain, Network_Observability) Verify FlowCollector status page components and conditions", { tags: ['@netobserv-critical'] }, function () {
        flowcollectorStatusPage.visit()

        // Verify status page title with status icon and tooltip on hover
        cy.contains('Network Observability FlowCollector status').should('exist')
        cy.get('button[aria-label="FlowCollector status"]').should('exist')
        cy.get('button[aria-label="FlowCollector status"] span').first().trigger('mouseenter', { force: true })
        cy.get('.pf-v5-c-tooltip__content', { timeout: 10000 }).should('contain.text', 'FlowCollector is ready')

        // Verify component statuses table headers
        cy.contains('Component statuses').should('exist')
        cy.contains('th', 'Component').should('exist')
        cy.contains('th', 'State').should('exist')
        cy.contains('th', 'Replicas').should('exist')
        cy.contains('th', 'Details').should('exist')

        // Verify component rows
        cy.contains('eBPF Agent').should('exist')
        cy.contains('Flowlogs Pipeline').should('exist')
        cy.contains('Console Plugin').should('exist')
        cy.contains('Loki').should('exist')
        cy.contains('Monitoring').should('exist')

        // Verify "Open Network Traffic page" button is enabled when FC is ready
        cy.get(pluginSelectors.openNetworkTraffic).should('exist')
            .should('not.have.attr', 'aria-disabled', 'true')

        // Verify demoloki install warning alert at top of status page
        cy.get(flowcollectorStatusSelectors.configIssueRow).should('exist')
            .should('have.attr', 'data-test-status', 'True')
            .should('have.attr', 'data-test-reason', 'Warnings')
        cy.get(flowcollectorStatusSelectors.configWarningAlert).should('exist')
            .find('.pf-v5-c-alert__title')
            .should('contain.text', 'Configuration warnings')

        // Verify Conditions
        cy.contains('Conditions').should('exist')
        cy.get(flowcollectorStatusSelectors.readyRow)
            .should('have.attr', 'data-test-status', 'True')
        cy.get(flowcollectorStatusSelectors.agentReadyRow).should('exist')
        cy.get(flowcollectorStatusSelectors.pluginReadyRow).should('exist')
        cy.get(flowcollectorStatusSelectors.monitoringReadyRow).should('exist')
    })

    it("(OCP-88744, kapjain, Network_Observability) Verify status indicator on Network Traffic page", function () {
        cy.visit('/netflow-traffic')
        cy.get('#overview-container', { timeout: 60000 }).should('exist')
        cy.get(flowcollectorStatusSelectors.statusIndicator).should('exist')

        // Verify tooltip on hover - mouseenter triggers Floating UI tooltip
        cy.get(flowcollectorStatusSelectors.statusIndicator + ' span').first().trigger('mouseenter', { force: true })
        cy.get('.pf-v5-c-tooltip__content', { timeout: 10000 }).should('contain.text', 'FlowCollector is ready')

        cy.get(flowcollectorStatusSelectors.statusIndicator).click()
        cy.contains('Network Observability FlowCollector status', { timeout: 30000 }).should('exist')
    })

    it("(OCP-88744, kapjain, Network_Observability) Verify status indicator on Network Health page", function () {
        cy.visit('/network-health')
        cy.get('#content-scrollable', { timeout: 30000 }).should('exist')
        cy.get(flowcollectorStatusSelectors.statusIndicator).should('exist')

        // Verify tooltip on hover - mouseenter triggers Floating UI tooltip
        cy.get(flowcollectorStatusSelectors.statusIndicator + ' span').first().trigger('mouseenter', { force: true })
        cy.get('.pf-v5-c-tooltip__content', { timeout: 10000 }).should('contain.text', 'FlowCollector is ready')

        cy.get(flowcollectorStatusSelectors.statusIndicator).click()
        cy.contains('Network Observability FlowCollector status', { timeout: 30000 }).should('exist')
    })

    it("(OCP-88744, kapjain, Network_Observability) Verify FlowCollector status via search and cluster columns", function () {
        // Search for FlowCollector via search page
        searchPage.navToSearchPage()
        searchPage.chooseResourceType('FlowCollector')
        cy.get('table[data-test="data-view-table"]', { timeout: 30000 }).should('exist')
        cy.get('[data-test="data-view-cell-cluster-name"]').should('exist')

        // Verify additionalPrinterColumn headers
        cy.get('[data-test="additional-printer-column-header-Agent"]').should('exist')
        cy.get('[data-test="additional-printer-column-header-Processor"]').should('exist')
        cy.get('[data-test="additional-printer-column-header-Plugin"]').should('exist')
        cy.get('[data-test="additional-printer-column-header-Status"]').should('exist')

        // Verify status column shows Ready
        cy.get('[data-test="additional-printer-column-data-Status"]').should('contain.text', 'Ready')
    })

    after("after all tests are done", function () {
        Operator.deleteFlowCollector()
        cy.adminCLI(`oc adm policy remove-cluster-role-from-user cluster-admin ${Cypress.env('LOGIN_USERNAME')}`)
    })
})

describe('Network_Observability FlowCollector status error scenario', { tags: ['Network_Observability'] }, function () {

    before('setup', function () {
        cy.adminCLI(`oc adm policy add-cluster-role-to-user cluster-admin ${Cypress.env('LOGIN_USERNAME')}`)
        cy.uiLogin(Cypress.env('LOGIN_IDP'), Cypress.env('LOGIN_USERNAME'), Cypress.env('LOGIN_PASSWORD'))

        Operator.install()
        cy.checkStorageClass(this)

        // Deploy FlowCollector with Loki enabled pointing to a non-existent LokiStack
        cy.deployFlowcollectorFromFixture('./cypress/fixtures/flowcollector/fc_lokiWithoutStack.yaml')
    })

    it("(OCP-88744, kapjain, Network_Observability) Verify error status when Loki enabled without LokiStack", function () {
        // Visit status page and wait for Ready condition to show False (error state)
        cy.visit('k8s/cluster/flows.netobserv.io~v1beta2~FlowCollector/status')
        cy.get(flowcollectorStatusSelectors.readyRow, { timeout: 120000 }).should('exist')
            .should('have.attr', 'data-test-status', 'False')

        // Verify status icon tooltip shows error
        cy.get('button[aria-label="FlowCollector status"] span').first().trigger('mouseenter', { force: true })
        cy.get('.pf-v5-c-tooltip__content', { timeout: 10000 }).should('contain.text', 'FlowCollector has errors')

        // Verify "Open Network Traffic page" button is disabled
        cy.get(pluginSelectors.openNetworkTraffic).should('exist')
            .should('have.attr', 'aria-disabled', 'true')
    })

    after("cleanup", function () {
        Operator.deleteFlowCollector()
        cy.adminCLI(`oc adm policy remove-cluster-role-from-user cluster-admin ${Cypress.env('LOGIN_USERNAME')}`)
    })
})
