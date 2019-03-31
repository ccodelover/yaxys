/* eslint-disable react/prop-types */
import React, { Component } from "react"
import { connect } from "react-redux"

import YaxysClue, { queries } from "../services/YaxysClue"
import { pick } from "lodash"

import { withStyles } from "@material-ui/core/styles"
import { commonClasses, withConstants } from "../services/Utils"

import { Paper } from "@material-ui/core"

import Wrapper from "../components/Wrapper.jsx"
import Loader from "../components/Loader.jsx"
import Update from "../components/Update.jsx"
import ModelForm from "../components/ModelForm.jsx"
import Connection from "../components/Connection.jsx"
import AccessRights from "../components/AccessRights.jsx"
import { withNamespaces } from "react-i18next"

const doorClue = props => ({
  identity: "door",
  query: queries.FIND_BY_ID,
  id: props.match.params.id,
})
const doorSelector = YaxysClue.selectors.byClue(doorClue)

@withStyles(theme => commonClasses(theme))
@withConstants
@withNamespaces()
@connect(
  (state, props) => ({
    door: doorSelector(state, props),
  }),
  {
    loadDoor: YaxysClue.actions.byClue,
    updateAccessPoint: YaxysClue.actions.byClue,
  }
)
export default class Door extends Component {
  constructor(props) {
    super(props)
    this.state = {
      door: this.props2DoorState(props),
      forceValidation: false,
      pickerOpen: false,
      pickerIdentity: null,
      creatorOpen: false,
      creatorIdentity: null,
      accessPointUpdateSelector: null,
      accessPointUpdateAttemptAt: null,
    }
  }

  componentDidMount() {
    this.props.loadDoor(doorClue(this.props))
  }

  componentDidUpdate(prevProps) {
    const isReady = this.props.door && this.props.door.success
    const wasReady = prevProps.door && prevProps.door.success
    if (isReady && !wasReady) {
      /* eslint-disable-next-line react/no-did-update-set-state */
      this.setState({ door: this.props2DoorState(this.props) })
    }
  }

  props2DoorState(propsArg) {
    const props = propsArg || this.props
    const door =
      props.door && props.door.success ? pick(props.door.data, "id", "name", "description") : {}

    return door
  }

  onFormChange = data => {
    this.setState({
      door: { ...this.state.door, ...data.values },
      modifiedAt: new Date().getTime(),
    })
  }

  canAddAccessPoint = accessPoints => {
    if (accessPoints?.data?.length >= 2) {
      alert(this.props.t("DOOR_PAGE.TOO_MUCH_APS_MESSAGE"))
      return false
    }
  }

  render() {
    const { constants, door, match, classes, t } = this.props
    const { settings, schemas } = constants
    const entityInstance = t("ENTITY_INSTANCE", {
      entity: "$t(DOOR)",
      info: {
        id: match.params.id,
        item: door,
      },
    })
    const update = (
      <Update
        clue={doorClue(this.props)}
        current={this.state.door}
        schema={schemas.door}
        modifiedAt={this.state.modifiedAt}
      />
    )
    return (
      <Wrapper
        bottom={update}
        breadcrumbs={[
          { title: t("DOOR_PLURAL"), url: "/doors" },
          entityInstance,
        ]}
      >
        <h1 style={{ marginTop: 0 }}>{entityInstance}</h1>
        <Loader item={door}>
          <Paper className={classes.block}>
            <ModelForm
              autoFocus={true}
              values={this.state.door}
              onChange={this.onFormChange}
              forceValidation={this.state.forceValidation}
              schema={schemas.door}
              margin="dense"
              attributes={["name", "description"]}
            />
          </Paper>
        </Loader>
        <Paper className={classes.block}>
          <h5>{t("AP_PLURAL")}</h5>
          <Connection
            relatedIdentity="accesspoint"
            relatedProperty="door"
            parentId={match.params.id}
            additionalCluePropertiea={{ populate: "zoneTo" }}
            columns={[
              "id",
              "name",
              "description",
              ...(settings.hideZones ? [] : ["zoneTo"]),
            ]}
            canAddExisting={this.canAddAccessPoint}
            canCreateNew={this.canAddAccessPoint}
            url={accessPoint => `/access-points/${accessPoint.id}`}
          />
        </Paper>
        <Paper className={classes.block}>
          <h5>{ t("DOOR_PAGE.USERS_AND_PROFILES_HEADER") }</h5>
          <AccessRights
            mode={"hardware"}
            hardwareProperty={"door"}
            hardwarePropertyValue={ match.params.id }
          />
        </Paper>
      </Wrapper>
    )
  }
}
