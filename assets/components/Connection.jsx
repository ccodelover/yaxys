import React, { Component } from "react"
import PropTypes from "prop-types"
import { connect } from "react-redux"

import YaxysClue, { queries } from "../services/YaxysClue"

import { withStyles } from "@material-ui/core/styles"
import { withConstants } from "../services/Utils"

import { Button } from "@material-ui/core"

import Loader from "./Loader.jsx"
import ModelTable from "./ModelTable.jsx"
import ModelPicker from "./ModelPicker.jsx"
import ModelCreator from "./ModelCreator.jsx"

import Request from "../components/Request.jsx"
import { without } from "lodash"
import { withNamespaces } from "react-i18next"

const relatedClue = props => ({
	identity: props.relatedIdentity,
	query: queries.FIND,
	where: {
		[props.relatedProperty]: props.parentId,
	},
	...props.additionalClueProperties,
})
const relatedSelector = YaxysClue.selectors.byClue(relatedClue)

@withStyles(theme => ({
	button: {
		margin: "0 10px 10px 0",
	},
}))
@withConstants
@withNamespaces()
@connect(
	(state, props) => ({
		related: relatedSelector(state, props),
	}),
	{
		loadRelated: YaxysClue.actions.byClue,
		updateRelated: YaxysClue.actions.byClue,
	}
)
export default class Connection extends Component {
	static propTypes = {
		// from HOCs
		constants: PropTypes.object,
		related: PropTypes.object,
		loadRelated: PropTypes.func,
		updateRelated: PropTypes.func,
		t: PropTypes.func,

		relatedIdentity: PropTypes.string,
		relatedProperty: PropTypes.string,
		parentId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		additionalClueProperties: PropTypes.object,
		columns: PropTypes.array,
		url: PropTypes.func,

		canAddExisting: PropTypes.func,
		canCreateNew: PropTypes.func,
		canDelete: PropTypes.func,

		hideDeleteColumn: PropTypes.bool,
	}

	constructor(props) {
		super(props)
		this.state = {
			pickerOpen: false,
			creatorOpen: false,
		}
	}

	componentDidMount() {
		this.props.loadRelated(relatedClue(this.props))
	}

	onPickerOpen = event => {
		const { canAddExisting, related } = this.props
		if (canAddExisting?.(related) === false) {
			return
		}

		this.setState({
			pickerOpen: true,
		})
	}

	onPickerClose = event => {
		this.setState({
			pickerOpen: false,
		})
	}

	onPick = item => {
		this.updateRelated(item, this.props.parentId)
		this.setState({
			pickerOpen: false,
		})
	}

	onCreatorOpen = event => {
		const { canCreateNew, related } = this.props
		if (canCreateNew?.(related) === false) {
			return
		}

		this.setState({
			creatorOpen: true,
		})
	}

	onCreatorClose = event => {
		this.setState({
			creatorOpen: false,
		})
	}

	onCreate = item => {
		this.updateRelated(item, this.props.parentId)
		this.setState({
			creatorOpen: false,
		})
	}

	updateRelated(model, value) {
		const { relatedIdentity, relatedProperty } = this.props

		const clue = {
			identity: relatedIdentity,
			query: queries.UPDATE,
			id: model.id,
			data: {
				[relatedProperty]: value,
			},
		}
		const action = this.props.updateRelated(clue)
		this.setState({
			relatedUpdateSelector: YaxysClue.selectors.byRequestId(action.payload.requestId, {
				resultOnly: true,
			}),
			relatedUpdateAttemptAt: new Date().getTime(),
		})
	}

	onRelatedUpdateRepeat = requestId => {
		this.setState({
			relatedUpdateSelector: YaxysClue.selectors.byRequestId(requestId, { resultOnly: true }),
			relatedUpdateAttemptAt: new Date().getTime(),
		})
	}

	onRelatedUpdated = () => {
		this.props.loadRelated(relatedClue(this.props), { force: true })
	}

	onDelete = model => {
		const { constants, relatedIdentity, canDelete, t } = this.props
		const relatedSchema = constants.schemas[relatedIdentity?.toLowerCase()]
		if (canDelete?.(model) === false) {
			return
		}

		const subject = `${t("DEFINITE_ARTICLE")} ${t(relatedSchema.i18Key, { context: "ACCUSATIVE" })}`
		if (!confirm(`${t("ARE_YOU_SURE_TO")} ${t("DETACH").toLowerCase()} ${subject}?`)) {
			return
		}
		this.updateRelated(model, null)
	}

	render() {
		const {
			constants,
			relatedIdentity,
			relatedProperty,
			related,
			parentId,
			columns,
			url,
			hideDeleteColumn,
			classes,
      t,
		} = this.props
		const relatedSchema = constants.schemas[relatedIdentity?.toLowerCase()]
		if(related) {
			console.log(related.error)
			console.log(related.data)
		}
		return (
			<Loader item={related}>
				<Button
					variant="text"
					color="secondary"
					onClick={this.onPickerOpen}
					className={classes.button}
				>
					{t("ADD_EXISTING")}
				</Button>
				<Button
					variant="text"
					color="secondary"
					onClick={this.onCreatorOpen}
					className={classes.button}
				>
					{t("CREATE_NEW")}
				</Button>
				<ModelTable
					schema={relatedSchema}
					data={related?.data || []}
					url={url}
					columns={columns}
					onDelete={!hideDeleteColumn && this.onDelete}
				/>
				{this.state.pickerOpen && (
					<ModelPicker
						onClose={this.onPickerClose}
						onPick={this.onPick}
						open={this.state.pickerOpen}
						identity={relatedIdentity}
					/>
				)}
				{this.state.creatorOpen && (
					<ModelCreator
						onClose={this.onCreatorClose}
						onCreate={this.onCreate}
						open={this.state.creatorOpen}
						identity={relatedIdentity}
						initial={{ [relatedProperty]: Number(parentId) }}
						attributes={without(relatedSchema.defaultProperties, "id", relatedProperty)}
					/>
				)}
				<Request
					selector={this.state.relatedUpdateSelector}
          message={ `${t("UPDATE_PROCESS")} ${t("DEFINITE_ARTICLE")} ${t(relatedSchema.i18Key, { context: "PLURAL" })}`}
          attemptAt={this.state.relatedUpdateAttemptAt}
					onSuccess={this.onRelatedUpdated}
					onRepeat={this.onRelatedUpdateRepeat}
				/>
			</Loader>
		)
	}
}
