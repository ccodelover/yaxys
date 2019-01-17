/* eslint-disable react/prop-types */
import React, { Component } from "react"
import { connect } from "react-redux"

import { Paper, Button } from "@material-ui/core"

import YaxysClue, { queries } from "../services/YaxysClue"
import { withConstants } from "../services/Utils"

import Wrapper from "../components/Wrapper.jsx"
import Created from "../components/Created.jsx"
import ModelTableLoader from "../components/ModelTableLoader.jsx"
import ModelDialog from "../components/ModelDialog.jsx"
import { withNamespaces } from "react-i18next"

const CREATED_ACCESS_POINTS_MARKER = "accessPoints-page"
const createdAccessPointsSelector = YaxysClue.selectors.byClue(
  props => ({ identity: "accesspoint", query: queries.CREATE }),
  { marker: CREATED_ACCESS_POINTS_MARKER }
)

@withNamespaces()
@withConstants
@connect(
  (state, props) => ({
    createdAccessPoints: createdAccessPointsSelector(state, props),
  }),
  {
    createAccessPoint: YaxysClue.actions.byClue,
  }
)
export default class AccessPoints extends Component {
  state = {
    addOpen: false,
  }

  onAdd = event => {
    this.setState({ addOpen: true })
  }

  onAddClose = () => {
    this.setState({ addOpen: false })
  }

  onAddReady = values => {
    this.setState({ addOpen: false })

    this.props.createAccessPoint(
      {
        identity: "accesspoint",
        query: queries.CREATE,
        data: values,
      },
      { marker: CREATED_ACCESS_POINTS_MARKER }
    )
  }

  render() {
    const { constants, t } = this.props
    return (
      <Wrapper breadcrumbs={[t("APS")]}>
        <h1 style={{ marginTop: 0 }}>{t("APS")}</h1>
        <Button
          variant="text"
          color="secondary"
          onClick={this.onAdd}
          title={t("AccessPoints_CREATE_AP")}
        >
          {t("AccessPoints_ADD_AP")}
        </Button>
        <Created
          items={this.props.createdAccessPoints}
          content={accessPoint =>
            accessPoint.title
              ? `#${accessPoint.id} ${accessPoint.title}`
              : t("AP_#", { ap: accessPoint.id })
          }
          url={accessPoint => `/access-points/${accessPoint.id}`}
        />
        <Paper>
          <ModelTableLoader
            identity="accesspoint"
            url={accessPoint => `/access-points/${accessPoint.id}`}
            columns={["id", "title", "description", "door", "zoneTo"]}
            additionalClueProperties={{ populate: "zoneTo,door" }}
          />
        </Paper>
        <br />
        <ModelDialog
          title={t("AccessPoints_CREATE_AP")}
          open={this.state.addOpen}
          onClose={this.onAddClose}
          onReady={this.onAddReady}
          schema={constants.schemas.accesspoint}
          attributes={["title", "description"]}
          btnReady={t("CREATE")}
        >
          {t("AccessPoints_CREATE_DESC")}
        </ModelDialog>
      </Wrapper>
    )
  }
}
