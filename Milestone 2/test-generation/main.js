const esprima   = require('esprima');
const escodegen = require('escodegen');
const _         = require('lodash');
const path      = require('path');
const fs        = require('fs');
const debug     = require('debug')('checkbox.io:testgen');
const product   = require('iter-tools/lib/product');

// map of source modules we find in source
var sourceModules = {};

(module.exports.main = function() {

	debug(JSON.stringify(process.argv, null, 2));

	// parse command line options
	let args = {
		inputFilePath: path.resolve('subject.js'),
		outputFilePath: null,
	};
	if (process.argv.length > 2) args.inputFilePath = path.resolve(process.argv[2]);
	if (process.argv.length > 3) args.outputFilePath = path.resolve(process.argv[3]);
	else args.outputFilePath = path.join(path.dirname(args.inputFilePath), 'test.js');

	debug('Processing ' + args.inputFilePath);
	debug('Writing output to ' + args.outputFilePath);

	// read input source file
	let buf = fs.readFileSync(args.inputFilePath, 'utf8');

	// generated test source code program
	let program = generatedTestsProgram();

	// parse
	esprima.parse(buf, {}, function (node) {

		if (isSourceModuleRequire(node)) {
			// keep track of the location of the imported
			// source modules for further processing.
			debug('Source module require: ' + escodegen.generate(node));
			sourceModulePath = path.join(path.dirname(args.inputFilePath), node.init.arguments[0].value);
			debug('Source module path: ' + sourceModulePath);
			sourceModules[node.id.name] = {
					path: sourceModulePath
			};
		}

		if (isRouteDefinition(node)) {
			routeDefinition = node;
			debug('────────────────────────────────────────────────');
			debug(' Route Definition');
			debug('────────────────────────────────────────────────');
			debug(JSON.stringify(routeDefinition));
			debug(escodegen.generate(routeDefinition, {format: {compact: true}}));
			httpMethod = _.toUpper(routeDefinition.callee.property.name);
			routePath = routeDefinition.arguments[0].value;
			parameters = getEndpointParameters(routeDefinition);
			debug(JSON.stringify(parameters));

			constraints=[];
			_.forEach(parameters.params, function(param) {
				switch (param) {
				case 'id':
					constraints.push([
						{type:'params',name:param,value:'000000000000000000000001'},
//						{type:'params',name:param,value:'F00000000000000000000000'}
					]);
					break;
				case 'token':
					constraints.push([
						{type:'params',name:param,value:'1'},
//						{type:'params',name:param,value:'BAD_TOKEN'}
					]);
					break
				default:
					constraints.push([
						{type:'params',name:param,value:'good_'+param},
						{type:'params',name:param,value:'bad_'+param}
						]);
					break;
				}
			});
			_.forEach(parameters.query, function(query) {
				constraints.push([
					{type:'query',name:query,value:query == 'studyId' ? '000000000000000000000001' : 'good_'+query},
					{type:'query',name:query,value:'bad_'+query},
					null
				]);
			});
			_.forEach(parameters.body, function(body) {
				switch(body) {
				case 'token':
					constraints.push([
						{type:'body',name:body,value:'1'}
					]);
					break;
				case 'id':
					constraints.push([
						{type:'body',name:body,value:'000000000000000000000001'}
					]);
					break;
				case 'kind':
					constraints.push(
						_.map(['AMZN', 'SURFACE', 'IPADMINI','GITHUB','BROWSERSTACK'], function(value) {
							return {type:'body',name:body,value:value};
						})
					);
					break;
				case 'studyKind':
					constraints.push(
						_.map(['survey', 'dataStudy'], function(value) {
							return {type:'body',name:body,value:value};
						})
					);
					break;
				case 'invitecode':
					constraints.push([
						{type:'body',name:body,value:'RESEARCH'}
					]);
					break;
				case 'email':
					constraints.push([
						{type:'body',name:body,value:'lsanche@ncsu.edu'}
					]);
					break;
				default:
					constraints.push([
						{type:'body',name:body,value:'good_'+body},
						{type:'body',name:body,value:'bad_'+body},
						null
					]);
				}
			});
			debug(constraints);
			if (constraints.length > 0) {
				for (let testcase of product(...constraints)) {
					uri = routePath;
					qs = {};
					form = {};
					_.forEach(testcase, function(constraint) {
						if (constraint != null) {
							switch (constraint.type) {
							case 'params':
								uri = _.replace(uri, ':' + constraint.name, encodeURIComponent(constraint.value));
								break;
							case 'query':
								qs[constraint.name] = constraint.value;
								break;
							case 'body':
								form[constraint.name] = constraint.value;
								break;
							default:
								break;
							}
						}
					});
				addRequestCall(program, httpMethod, uri, qs, form);
				}
			} else {
				// no constraints found, just invoke as-is
				addRequestCall(program, httpMethod, routePath);
			}

		}

	});

	console.log(escodegen.generate(program));

})();

function isRouteDefinition(node) {
	if (!_.eq(node.type,'CallExpression')) return false;
	if (!_.eq(node.callee.type, 'MemberExpression')) return false;
	if (!_.eq(node.callee.object.name, 'app')) return false;
	if (!_.includes(['get','post'], node.callee.property.name)) return false;
	return true;
}

function isModuleRequire(node) {
	if (!_.eq(node.type,'VariableDeclarator')) return false;
	if (!_.eq(node.init.type,'CallExpression')) return false;
	if (!_.eq(node.init.callee.type,'Identifier')) return false;
	if (!_.eq(node.init.callee.name,'require')) return false;
	return true;
}

function isSourceModuleRequire(node) {
	if (!isModuleRequire(node)) return false;
	if (!_.startsWith(node.init.arguments[0].value,'.')) return false;
	return true;
}

function getEndpointParameters(routeDefinition) {
	// TODO route parameters
	// result
	results = { params:[], query:[], body: []};

	if (_.eq(routeDefinition.arguments[1].type, 'MemberExpression')) {
		moduleName = routeDefinition.arguments[1].object.name;
		moduleProperty = routeDefinition.arguments[1].property.name;
		if (_.has(sourceModules, moduleName)) {
			// remember request parameters references as we find them
			requestParameterReferences = [];
			// parse the module's source, looking for the exports
			esprima.parseModule(fs.readFileSync(sourceModules[moduleName].path, 'utf8'), {}, function (node) {
				if (isRequestParameterReference(node)) {
						debug('possible parameter reference: ' + escodegen.generate(node));
						requestParameterReferences.push(node);
					}
				if (isModuleExportDefinition(node)) {
					// if this is the definition we are looking for, gather parameters
					if (_.eq(node.expression.left.property.name, moduleProperty)) {
						_.forEach(requestParameterReferences, function(value) {
							debug(moduleName + '.' + moduleProperty + ' requires: ' + escodegen.generate(value));
							results[value.object.property.name].push(value.property.name);
						});
					} else {
						// else reset list of parameters
						requestParameterReferences = []
					}
				}
			});
		}
	}
	return results;
}

function isRequestParameterReference(node) {
	if (!_.eq(node.type, 'MemberExpression')) return false;
	if (!_.eq(node.object.type, 'MemberExpression')) return false;
	if (!_.eq(node.object.object.type, 'Identifier')) return false;
	if (!_.eq(node.object.object.name, 'req')) return false;
	if (!_.includes(['params','query','body'], node.object.property.name)) return false;
	return true;
}

function isModuleExportDefinition(node) {
	if (!_.eq(node.type, 'ExpressionStatement')) return false;
	if (!_.eq(node.expression.type, 'AssignmentExpression')) return false;
	if (!_.eq(node.expression.operator, '=')) return false;
	if (!_.eq(node.expression.left.type, 'MemberExpression')) return false;
	if (!_.eq(node.expression.left.object.type, 'Identifier')) return false;
	if (!_.eq(node.expression.left.object.name, 'exports')) return false;
	return true;
}

function generatedTestsProgram() {
	let program = {
		type: 'Program',
		body: []
	}
	requireModule(program, 'request');
	requireModule(program, 'mongodb');
	requireModule(program, 'assert');
	addFixture(program);
	addTestSetup(program);
	return program;
}

function requireModule(program, moduleName) {
	program.body.push({
		type: 'VariableDeclaration',
		declarations: [
			{
				type: 'VariableDeclarator',
				id: {
					type: 'Identifier',
					name: moduleName
				},
				init: {
					type: 'CallExpression',
					callee: {
						type: 'Identifier',
						name: 'require'
					},
					arguments: [
						{
							type: 'Literal',
							value: moduleName,
						}
					]
				}
			}
		],
		kind: 'const'
	});
}

function addFixture(program) {

	program.body.push({
		type: 'VariableDeclaration',
		declarations: [
			{
				type: 'VariableDeclarator',
				id: {
					type: 'ObjectPattern',
					properties: [
						{
							type: 'Property',
							key: {
								type: 'Identifier',
								name: 'URL'
							},
							value: {
								type: 'Identifier',
								name: 'URL'
							},
							shorthand: true
						}
						]
				},
				init: {
					type: 'CallExpression',
					callee: {
						type: 'Identifier',
						name: 'require'
					},
					arguments: [
						{
							type: 'Literal',
							value: 'url',
						}
						]
				}
			}
			],
			kind: 'const'
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'Identifier',
				name: 'mongoUrl'
			},
			right: {
				type: 'NewExpression',
				callee: {
					type: 'Identifier',
					name: 'URL'
				},
				arguments: [
					{
						type: 'Literal',
						value: 'mongodb://',
					}
					]
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'MemberExpression',
				computed: false,
				object: {
					type: 'Identifier',
					name: 'mongoUrl'
				},
				property: {
					type: 'Identifier',
					name: 'host'
				}
			},
			right: {
				type: 'LogicalExpression',
				operator: '||',
				left: {
					type: 'MemberExpression',
					computed: false,
					object: {
						type: 'MemberExpression',
						computed: false,
						object: {
							type: 'Identifier',
							name: 'process'
						},
						property: {
							type: 'Identifier',
							name: 'env'
						}
					},
					property: {
						type: 'Identifier',
						name: 'MONGO_HOST'
					}
				},
				right: {
					type: 'Literal',
					value: 'localhost:27017',
				}
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'MemberExpression',
				computed: false,
				object: {
					type: 'Identifier',
					name: 'mongoUrl'
				},
				property: {
					type: 'Identifier',
					name: 'username'
				}
			},
			right: {
				type: 'LogicalExpression',
				operator: '||',
				left: {
					type: 'MemberExpression',
					computed: false,
					object: {
						type: 'MemberExpression',
						computed: false,
						object: {
							type: 'Identifier',
							name: 'process'
						},
						property: {
							type: 'Identifier',
							name: 'env'
						}
					},
					property: {
						type: 'Identifier',
						name: 'MONGO_USER'
					}
				},
				right: {
					type: 'Literal',
					value: 'admin',
				}
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'MemberExpression',
				computed: false,
				object: {
					type: 'Identifier',
					name: 'mongoUrl'
				},
				property: {
					type: 'Identifier',
					name: 'password'
				}
			},
			right: {
				type: 'LogicalExpression',
				operator: '||',
				left: {
					type: 'MemberExpression',
					computed: false,
					object: {
						type: 'MemberExpression',
						computed: false,
						object: {
							type: 'Identifier',
							name: 'process'
						},
						property: {
							type: 'Identifier',
							name: 'env'
						}
					},
					property: {
						type: 'Identifier',
						name: 'MONGO_PASSWD'
					}
				},
				right: {
					type: 'Literal',
					value: 'MonGoPaSsWoRd',
				}
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'MemberExpression',
				computed: false,
				object: {
					type: 'Identifier',
					name: 'mongoUrl'
				},
				property: {
					type: 'Identifier',
					name: 'pathname'
				}
			},
			right: {
				type: 'Literal',
				value: '/',
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'MemberExpression',
				computed: false,
				object: {
					type: 'Identifier',
					name: 'mongoUrl'
				},
				property: {
					type: 'Identifier',
					name: 'search'
				}
			},
			right: {
				type: 'Literal',
				value: 'authSource=admin',
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'CallExpression',
			callee: {
				type: 'MemberExpression',
				computed: false,
				object: {
					type: 'MemberExpression',
					computed: false,
					object: {
						type: 'Identifier',
						name: 'mongodb'
					},
					property: {
						type: 'Identifier',
						name: 'MongoClient'
					}
				},
				property: {
					type: 'Identifier',
					name: 'connect'
				}
			},
			arguments: [
				{
					type: 'MemberExpression',
					computed: false,
					object: {
						type: 'Identifier',
						name: 'mongoUrl'
					},
					property: {
						type: 'Identifier',
						name: 'href'
					}
				},
				{
					type: 'FunctionExpression',
					id: null,
					params: [
						{
							type: 'Identifier',
							name: 'err'
						},
						{
							type: 'Identifier',
							name: 'client'
						}
						],
						body: {
							type: 'BlockStatement',
							body: [
								{
									type: 'ExpressionStatement',
									expression: {
										type: 'CallExpression',
										callee: {
											type: 'MemberExpression',
											computed: false,
											object: {
												type: 'Identifier',
												name: 'assert'
											},
											property: {
												type: 'Identifier',
												name: 'equal'
											}
										},
										arguments: [
											{
												type: 'Literal',
												value: null,
											},
											{
												type: 'Identifier',
												name: 'err'
											}
											]
									}
								},
								{
									type: 'VariableDeclaration',
									declarations: [
										{
											type: 'VariableDeclarator',
											id: {
												type: 'Identifier',
												name: 'db'
											},
											init: {
												type: 'CallExpression',
												callee: {
													type: 'MemberExpression',
													computed: false,
													object: {
														type: 'Identifier',
														name: 'client'
													},
													property: {
														type: 'Identifier',
														name: 'db'
													}
												},
												arguments: [
													{
														type: 'Literal',
														value: 'site',
													}
													]
											}
										}
										],
										kind: 'const'
								},
								{
									type: 'ExpressionStatement',
									expression: {
										type: 'CallExpression',
										callee: {
											type: 'Identifier',
											name: 'createFixture'
										},
										arguments: [
											{
												type: 'Identifier',
												name: 'db'
											},
											{
												type: 'FunctionExpression',
												id: null,
												params: [],
												body: {
													type: 'BlockStatement',
													body: [
														{
															type: 'ExpressionStatement',
															expression: {
																type: 'CallExpression',
																callee: {
																	type: 'MemberExpression',
																	computed: false,
																	object: {
																		type: 'Identifier',
																		name: 'client'
																	},
																	property: {
																		type: 'Identifier',
																		name: 'close'
																	}
																},
																arguments: []
															}
														}
														]
												},
												generator: false,
												expression: false,
												async: false
											}
											]
									}
								}
								]
						},
						generator: false,
						expression: false,
						async: false
				}
				]
		}
	});
	program.body.push({
		type: 'FunctionDeclaration',
		id: {
			type: 'Identifier',
			name: 'createFixture'
		},
		params: [
			{
				type: 'Identifier',
				name: 'db'
			},
			{
				type: 'Identifier',
				name: 'callback'
			}
			],
			body: {
				type: 'BlockStatement',
				body: [
					{
						type: 'VariableDeclaration',
						declarations: [
							{
								type: 'VariableDeclarator',
								id: {
									type: 'Identifier',
									name: 'collection'
								},
								init: {
									type: 'CallExpression',
									callee: {
										type: 'MemberExpression',
										computed: false,
										object: {
											type: 'Identifier',
											name: 'db'
										},
										property: {
											type: 'Identifier',
											name: 'collection'
										}
									},
									arguments: [
										{
											type: 'Literal',
											value: 'studies',
										}
										]
								}
							}
							],
							kind: 'const'
					},
					{
						type: 'ExpressionStatement',
						expression: {
							type: 'AssignmentExpression',
							operator: '=',
							left: {
								type: 'Identifier',
								name: 'token'
							},
							right: {
								type: 'Literal',
								value: '1',
							}
						}
					},
					{
						type: 'ExpressionStatement',
						expression: {
							type: 'AssignmentExpression',
							operator: '=',
							left: {
								type: 'Identifier',
								name: 'id'
							},
							right: {
								type: 'CallExpression',
								callee: {
									type: 'MemberExpression',
									computed: false,
									object: {
										type: 'Identifier',
										name: 'mongodb'
									},
									property: {
										type: 'Identifier',
										name: 'ObjectId'
									}
								},
								arguments: [
									{
										type: 'Literal',
										value: '000000000000000000000001',
									}
									]
							}
						}
					},
					{
						type: 'ExpressionStatement',
						expression: {
							type: 'CallExpression',
							callee: {
								type: 'MemberExpression',
								computed: false,
								object: {
									type: 'Identifier',
									name: 'collection'
								},
								property: {
									type: 'Identifier',
									name: 'update'
								}
							},
							arguments: [
								{
									type: 'ObjectExpression',
									properties: [
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: '_id'
											},
											computed: false,
											value: {
												type: 'Identifier',
												name: 'id'
											},
											kind: 'init',
											method: false,
											shorthand: false
										}
										]
								},
								{
									type: 'ObjectExpression',
									properties: [
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: '_id'
											},
											computed: false,
											value: {
												type: 'Identifier',
												name: 'id'
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'name'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'Study Number 1',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'description'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'A very special study.',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'studyKind'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'survey',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'researcherName'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'Luis Sanchez',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'contact'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'lsanche@ncsu.edu',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'awards'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'None',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'awardOptions'
											},
											computed: false,
											value: {
												type: 'ArrayExpression',
												elements: [
													{
														type: 'Literal',
														value: 'Amazon Gift Card',
													},
													{
														type: 'Literal',
														value: 'Github Swag',
													},
													{
														type: 'Literal',
														value: 'BrowserStack',
													},
													{
														type: 'Literal',
														value: 'Windows Surface RT',
													},
													{
														type: 'Literal',
														value: 'iPad Mini',
													},
													{
														type: 'Literal',
														value: 'Other',
													},
													{
														type: 'Literal',
														value: 'None',
													}
													]
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'status'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'open',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'goal'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 100,
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'invitecode'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: 'RESEARCH',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'markdown'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: '# Study',
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'token'
											},
											computed: false,
											value: {
												type: 'Identifier',
												name: 'token'
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'adminLink'
											},
											computed: false,
											value: {
												type: 'BinaryExpression',
												operator: '+',
												left: {
													type: 'Literal',
													value: '/studies/admin/?token=',
												},
												right: {
													type: 'Identifier',
													name: 'token'
												}
											},
											kind: 'init',
											method: false,
											shorthand: false
										},
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'publicLink'
											},
											computed: false,
											value: {
												type: 'BinaryExpression',
												operator: '+',
												left: {
													type: 'Literal',
													value: '/studies/?id=',
												},
												right: {
													type: 'Identifier',
													name: 'id'
												}
											},
											kind: 'init',
											method: false,
											shorthand: false
										}
										]
								},
								{
									type: 'ObjectExpression',
									properties: [
										{
											type: 'Property',
											key: {
												type: 'Identifier',
												name: 'upsert'
											},
											computed: false,
											value: {
												type: 'Literal',
												value: true,
											},
											kind: 'init',
											method: false,
											shorthand: false
										}
										]
								},
								{
									type: 'FunctionExpression',
									id: null,
									params: [
										{
											type: 'Identifier',
											name: 'err'
										},
										{
											type: 'Identifier',
											name: 'result'
										}
										],
										body: {
											type: 'BlockStatement',
											body: [
												{
													type: 'ExpressionStatement',
													expression: {
														type: 'CallExpression',
														callee: {
															type: 'MemberExpression',
															computed: false,
															object: {
																type: 'Identifier',
																name: 'assert'
															},
															property: {
																type: 'Identifier',
																name: 'equal'
															}
														},
														arguments: [
															{
																type: 'Identifier',
																name: 'err'
															},
															{
																type: 'Literal',
																value: null,
															}
															]
													}
												},
												{
													type: 'ExpressionStatement',
													expression: {
														type: 'CallExpression',
														callee: {
															type: 'MemberExpression',
															computed: false,
															object: {
																type: 'Identifier',
																name: 'console'
															},
															property: {
																type: 'Identifier',
																name: 'log'
															}
														},
														arguments: [
															{
																type: 'Literal',
																value: 'Fixture created',
															}
															]
													}
												},
												{
													type: 'ExpressionStatement',
													expression: {
														type: 'CallExpression',
														callee: {
															type: 'Identifier',
															name: 'callback'
														},
														arguments: [
															{
																type: 'Identifier',
																name: 'result'
															}
															]
													}
												}
												]
										},
										generator: false,
										expression: false,
										async: false
								}
								]
						}
					}
					]
			},
			generator: false,
			expression: false,
			async: false
	});

}

function addTestSetup(program) {
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'Identifier',
				name: 'host'
			},
			right: {
				type: 'LogicalExpression',
				operator: '||',
				left: {
					type: 'MemberExpression',
					object: {
						type: 'MemberExpression',
						object: {
							type: 'Identifier',
							name: 'process'
						},
						property: {
							type: 'Identifier',
							name: 'env'
						}
					},
					property: {
						type: 'Identifier',
						name: 'TARGET_HOST'
					}
				},
				right: {
					type: 'Literal',
					value: 'localhost:80',
				}
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'Identifier',
				name: 'mongoHost'
			},
			right: {
				type: 'LogicalExpression',
				operator: '||',
				left: {
					type: 'MemberExpression',
					object: {
						type: 'MemberExpression',
						object: {
							type: 'Identifier',
							name: 'process'
						},
						property: {
							type: 'Identifier',
							name: 'env'
						}
					},
					property: {
						type: 'Identifier',
						name: 'MONGO_HOST'
					}
				},
				right: {
					type: 'Literal',
					value: 'localhost:27017',
				}
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'Identifier',
				name: 'mongoUser'
			},
			right: {
				type: 'LogicalExpression',
				operator: '||',
				left: {
					type: 'MemberExpression',
					object: {
						type: 'MemberExpression',
						object: {
							type: 'Identifier',
							name: 'process'
						},
						property: {
							type: 'Identifier',
							name: 'env'
						}
					},
					property: {
						type: 'Identifier',
						name: 'MONGO_USER'
					}
				},
				right: {
					type: 'Literal',
					value: 'admin',
				}
			}
		}
	});
	program.body.push({
		type: 'ExpressionStatement',
		expression: {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'Identifier',
				name: 'mongoPasswd'
			},
			right: {
				type: 'LogicalExpression',
				operator: '||',
				left: {
					type: 'MemberExpression',
					object: {
						type: 'MemberExpression',
						object: {
							type: 'Identifier',
							name: 'process'
						},
						property: {
							type: 'Identifier',
							name: 'env'
						}
					},
					property: {
						type: 'Identifier',
						name: 'MONGO_PASSWD'
					}
				},
				right: {
					type: 'Literal',
					value: 'MonGoPaSsWoRd',
				}
			}
		}
	});
}

function addRequestCall(program, httpMethod, uri, qs, form) {
	options = [
		{
			type: 'Property',
			key: {
				type: 'Identifier',
				name: 'method'
			},
			value: {
				type: 'Literal',
				value: httpMethod
			}
		},
		{
			type: 'Property',
			key: {
				type: 'Identifier',
				name: 'uri'
			},
			value: {
				type: 'BinaryExpression',
				operator: '+',
				left: {
					type: 'BinaryExpression',
					operator: '+',
					left: {
						type: 'Literal',
						value: 'http://',
					},
					right: {
						type: 'Identifier',
						name: 'host'
					}
				},
				right: {
					type: 'Literal',
					value: uri,
				}
			},
		},
		];
	// add query parameters
	if (!_.isEmpty(qs)) {
		options.push({
			type: 'Property',
			key: {
				type: 'Identifier',
				name: 'qs',
			},
			value: {
				type: 'ObjectExpression',
				properties: _.map(qs, function(value, key){
					return {
						type: 'Property',
						key: {
							type: 'Identifier',
							name: key
						},
						value: {
							type: 'Literal',
							value: value
						}
					};
				})
			}
		});
	}
	// add form fields
	if (!_.isEmpty(form)) {
		options.push({
			type: 'Property',
			key: {
				type: 'Identifier',
				name: 'form',
			},
			value: {
				type: 'ObjectExpression',
				properties: _.map(form, function(value, key){
					return {
						type: 'Property',
						key: {
							type: 'Identifier',
							name: key
						},
						value: {
							type: 'Literal',
							value: value
						}
					};
				})
			}
		});
	}
	requestStatement = {
		type: 'ExpressionStatement',
		expression: {
			type: 'CallExpression',
			callee: {
				type: 'Identifier',
				name: 'request',
			},
			arguments: [
				{
					type: 'ObjectExpression',
					properties: options,
				},
				{
				  type: 'FunctionExpression',
				  params: [],
				  body: {
					  type: 'BlockStatement',
					  body: [],
				  },
				}
			]
		}
	};
	program.body.push(requestStatement);
}
